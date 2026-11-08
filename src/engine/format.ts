/** Número con coma decimal, como se lee en español. */
export function fmt(n: number, decimals = 0): string {
  return n.toFixed(decimals).replace('.', ',');
}

/** Recorta un texto largo para mostrarlo en un mensaje. */
export function clip(s: string, max = 40): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
