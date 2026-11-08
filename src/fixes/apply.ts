// Aplica correcciones en Figma a través de un «puerto» mínimo (se simula en las pruebas).
// Un lote = un solo paso de deshacer: se llama a commitUndo() una vez, al final.
import type { FixKindGroup } from '../shared/messages';
import type { Finding, SpacingProp } from '../shared/types';

export interface FixNode {
  type: string;
  name: string;
  removed?: boolean;
  fills?: readonly unknown[] | symbol;
  layoutMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  characters?: string;
  setFillStyleIdAsync?: (id: string) => Promise<void>;
  setTextStyleIdAsync?: (id: string) => Promise<void>;
  getRangeAllFontNames?: (start: number, end: number) => unknown[];
}

export interface FixPort {
  getNode(id: string): Promise<FixNode | null>;
  getTextStyleFont(id: string): Promise<unknown | null>;
  getVariable(id: string): Promise<unknown | null>;
  loadFont(font: unknown): Promise<void>;
  bindColor(paint: unknown, variable: unknown): unknown;
  commitUndo(): void;
}

export interface ApplyResult {
  kind: FixKindGroup;
  applied: string[];
  skipped: string[];
}

const SPACING_FIELD: Record<SpacingProp, keyof FixNode> = {
  gap: 'itemSpacing',
  padL: 'paddingLeft',
  padR: 'paddingRight',
  padT: 'paddingTop',
  padB: 'paddingBottom',
};

type Applier = (f: Finding, node: FixNode, port: FixPort, names: Record<string, string>) => Promise<boolean>;

const APPLY: Record<FixKindGroup, Applier> = {
  async rename(f, node, _port, names) {
    if (f.fix?.kind !== 'rename') return false;
    node.name = names[f.id] ?? f.fix.suggested;
    return true;
  },

  async 'apply-color'(f, node, port) {
    const fix = f.fix;
    if (fix?.kind !== 'apply-color' || !Array.isArray(node.fills)) return false;
    if (fix.source === 'style') {
      if (!node.setFillStyleIdAsync) return false;
      await node.setFillStyleIdAsync(fix.styleId);
      return true;
    }
    const variable = await port.getVariable(fix.styleId);
    if (!variable) return false;
    const fills = [...node.fills] as { type?: string; visible?: boolean }[];
    let idx = -1;
    fills.forEach((p, i) => {
      if (p.type === 'SOLID' && p.visible !== false) idx = i;
    });
    if (idx < 0) return false;
    fills[idx] = port.bindColor(fills[idx], variable) as (typeof fills)[number];
    node.fills = fills;
    return true;
  },

  async 'apply-text-style'(f, node, port) {
    const fix = f.fix;
    if (fix?.kind !== 'apply-text-style' || node.type !== 'TEXT' || !node.setTextStyleIdAsync) return false;
    // Los textos necesitan sus fuentes cargadas antes de cambiar de estilo.
    const font = await port.getTextStyleFont(fix.styleId);
    if (!font) return false;
    await port.loadFont(font);
    for (const current of node.getRangeAllFontNames?.(0, (node.characters ?? '').length) ?? []) await port.loadFont(current);
    await node.setTextStyleIdAsync(fix.styleId);
    return true;
  },

  async 'snap-spacing'(f, node) {
    const fix = f.fix;
    if (fix?.kind !== 'snap-spacing' || !node.layoutMode || node.layoutMode === 'NONE') return false;
    // Si el valor ya no es el que se revisó, el usuario lo cambió: se respeta.
    const stale = fix.changes.some((c) => node[SPACING_FIELD[c.prop]] !== c.from);
    if (stale) return false;
    for (const c of fix.changes) (node as unknown as Record<string, number>)[SPACING_FIELD[c.prop] as string] = c.to;
    return true;
  },
};

/**
 * Aplica las correcciones de `findings` (todas del mismo tipo). Las capas que ya no existen,
 * o que cambiaron desde la revisión, se omiten sin romper el resto.
 */
export async function applyFixes(
  kind: FixKindGroup,
  findings: Finding[],
  port: FixPort,
  names: Record<string, string> = {},
): Promise<ApplyResult> {
  const applied: string[] = [];
  const skipped: string[] = [];
  for (const f of findings) {
    if (f.fix?.kind !== kind) {
      skipped.push(f.id);
      continue;
    }
    try {
      const node = await port.getNode(f.nodeId);
      const ok = node && !node.removed ? await APPLY[kind](f, node, port, names) : false;
      (ok ? applied : skipped).push(f.id);
    } catch {
      skipped.push(f.id);
    }
  }
  // Un solo paso de deshacer por lote.
  if (applied.length) port.commitUndo();
  return { kind, applied, skipped };
}
