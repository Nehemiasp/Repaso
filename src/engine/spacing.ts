import type { LayoutInfo, SpacingChange, SpacingProp } from '../shared/types';

/** Valor más cercano de la escala (múltiplos de `grid`). En empate, el mayor. */
export function nearestOnGrid(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

export function isOnGrid(value: number, grid: number): boolean {
  const r = value / grid;
  return Math.abs(r - Math.round(r)) < 1e-6;
}

const PROPS: SpacingProp[] = ['gap', 'padL', 'padR', 'padT', 'padB'];

/** Valores de gap y padding de un auto layout que se salen de la escala. */
export function spacingChanges(layout: LayoutInfo, grid: number): SpacingChange[] {
  if (layout.mode === 'NONE') return [];
  const out: SpacingChange[] = [];
  for (const prop of PROPS) {
    if (prop === 'gap' && layout.gapAuto) continue;
    const from = layout[prop];
    if (!isOnGrid(from, grid)) out.push({ prop, from, to: nearestOnGrid(from, grid) });
  }
  return out;
}
