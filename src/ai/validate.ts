// Validación a mano de lo que devuelve la IA. Nada de lo que llega se usa sin pasar por aquí.
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError('La respuesta no es JSON válido.');
  }
}

function list(v: unknown, key: string): Record<string, unknown>[] {
  if (!isObj(v) || !Array.isArray(v[key])) throw new ValidationError(`Falta la lista «${key}».`);
  return (v[key] as unknown[]).filter(isObj);
}

const s = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export interface NameItem {
  id: string;
  name: string;
}

const NAME_MAX = 60;
const DEFAULT_LIKE = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Image|Section|Slice|Component)(\s+\d+)?$/i;

/** Un nombre sirve si es breve, sin saltos, y no repite el nombre por defecto. Los demás se descartan uno a uno. */
export function validateNames(raw: unknown, validIds: ReadonlySet<string>): NameItem[] {
  const out: NameItem[] = [];
  for (const it of list(raw, 'names')) {
    const id = s(it.id);
    const name = s(it.name)?.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ').trim();
    if (!id || !validIds.has(id) || !name) continue;
    if (name.length > NAME_MAX || /[\n\r]/.test(name) || DEFAULT_LIKE.test(name) || /\d{3,}/.test(name)) continue;
    if (name.split(' / ').length > 4 || name.split(' / ').some((p) => !p.trim())) continue;
    out.push({ id, name });
  }
  return out;
}

export interface StateNote {
  id: string;
  /** Un texto por estado faltante. */
  notes: { state: string; description: string }[];
}

export function validateStates(raw: unknown, validIds: ReadonlySet<string>): StateNote[] {
  const out: StateNote[] = [];
  for (const it of list(raw, 'sets')) {
    const id = s(it.id);
    if (!id || !validIds.has(id) || !Array.isArray(it.missing)) continue;
    const notes = (it.missing as unknown[])
      .filter(isObj)
      .map((m) => ({ state: s(m.state)?.trim() ?? '', description: s(m.description)?.trim() ?? '' }))
      .filter((m) => m.state && m.description && m.description.length <= 400);
    if (notes.length) out.push({ id, notes });
  }
  return out;
}

export type CopyKind = 'spelling' | 'case' | 'tone';
export interface CopyIssue {
  id: string;
  kind: CopyKind;
  suggested: string;
  reason: string;
}

/**
 * Filtra falsas alarmas: el texto sugerido debe existir, ser distinto del actual
 * y no ser desproporcionado (la IA a veces «reescribe» en vez de corregir).
 */
export function validateCopy(raw: unknown, texts: ReadonlyMap<string, string>): CopyIssue[] {
  const out: CopyIssue[] = [];
  for (const it of list(raw, 'issues')) {
    const id = s(it.id);
    const kind = s(it.kind);
    const suggested = s(it.suggested)?.trim();
    const reason = s(it.reason)?.trim() ?? '';
    const current = id ? texts.get(id) : undefined;
    if (!id || current === undefined || !suggested) continue;
    if (kind !== 'spelling' && kind !== 'case' && kind !== 'tone') continue;
    if (suggested === current.trim()) continue;
    if (suggested.length > current.length * 2 + 40) continue;
    if (kind === 'case' && suggested.toLowerCase() !== current.trim().toLowerCase()) continue;
    out.push({ id, kind, suggested, reason: reason.slice(0, 200) });
  }
  return out;
}

export function validateSummary(raw: unknown): string {
  const text = isObj(raw) ? s(raw.summary)?.replace(/\s+/g, ' ').trim() : null;
  if (!text || text.length < 20 || text.length > 700) throw new ValidationError('Resumen fuera de rango.');
  return text;
}
