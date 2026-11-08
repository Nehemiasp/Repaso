// Caché por archivo: no se vuelve a pagar por lo que ya se revisó y no cambió.

/** Hash de 64 bits (dos FNV-1a de 32) en base 36. Suficiente para distinguir capas dentro de un archivo. */
export function hash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x85ebca6b);
  }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36);
}

/** pluginData admite ~100 KB por clave: se guarda menos para tener margen. */
export const CACHE_MAX_BYTES = 80_000;

export class AiCache {
  private map = new Map<string, string>();

  static parse(raw: string): AiCache {
    const c = new AiCache();
    try {
      const j = JSON.parse(raw) as { v?: number; e?: [string, string][] };
      if (j.v === 1 && Array.isArray(j.e)) for (const [k, v] of j.e) if (typeof k === 'string' && typeof v === 'string') c.map.set(k, v);
    } catch {
      // Caché ilegible: se empieza de cero.
    }
    return c;
  }

  get size(): number {
    return this.map.size;
  }

  get(ns: string, key: string): string | undefined {
    const k = `${ns}:${key}`;
    const v = this.map.get(k);
    if (v !== undefined) {
      // Lo usado recientemente es lo último en descartarse.
      this.map.delete(k);
      this.map.set(k, v);
    }
    return v;
  }

  set(ns: string, key: string, value: string): void {
    const k = `${ns}:${key}`;
    this.map.delete(k);
    this.map.set(k, value);
  }

  /** Serializa descartando lo más antiguo hasta caber en `maxBytes`. */
  serialize(maxBytes = CACHE_MAX_BYTES): string {
    let entries = [...this.map.entries()];
    let out = JSON.stringify({ v: 1, e: entries });
    while (out.length > maxBytes && entries.length > 0) {
      entries = entries.slice(Math.max(1, Math.ceil(entries.length * 0.1)));
      out = JSON.stringify({ v: 1, e: entries });
    }
    return out;
  }
}
