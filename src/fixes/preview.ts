// Vista previa de un lote de correcciones. Pura: no toca Figma.
import { toHex } from '../engine/color';
import type { FixKindGroup, FixPreview, FixPreviewItem } from '../shared/messages';
import type { DocNode, Finding, Scene } from '../shared/types';

const SPACING_LABEL = { gap: 'espacio', padL: 'relleno izq.', padR: 'relleno der.', padT: 'relleno sup.', padB: 'relleno inf.' } as const;

const topSolidHex = (n: DocNode | undefined): string => {
  const f = [...(n?.fills ?? [])].reverse().find((p) => p.kind === 'solid' && p.visible);
  return f && f.kind === 'solid' ? toHex(f.color) : '—';
};

const textLabel = (n: DocNode | undefined): string => {
  const t = n?.text;
  return t ? `${t.fontFamily} ${t.fontSize} / ${t.fontWeight >= 700 ? 'Bold' : t.fontWeight >= 500 ? 'Medium' : 'Regular'}` : '—';
};

export interface PreviewOptions {
  /** Nombres propuestos por la IA (por id de hallazgo); tienen prioridad sobre el nombre por tipo. */
  aiNames?: Record<string, string>;
}

/** Arma antes → después para los hallazgos que tienen corrección del tipo pedido. */
export function buildPreview(kind: FixKindGroup, findings: Finding[], scene: Scene, opts: PreviewOptions = {}): FixPreview {
  const items: FixPreviewItem[] = [];
  for (const f of findings) {
    const fix = f.fix;
    if (!fix || fix.kind !== kind) continue;
    const node = scene.nodes[f.nodeId];
    const base = { findingId: f.id, nodeId: f.nodeId, nodeName: f.nodeName };
    switch (fix.kind) {
      case 'rename': {
        const ai = opts.aiNames?.[f.id];
        items.push({ ...base, before: f.nodeName, after: ai ?? fix.suggested, source: ai ? 'ai' : 'type' });
        break;
      }
      case 'apply-color':
        items.push({ ...base, before: topSolidHex(node), after: `${fix.styleName} (${fix.source === 'variable' ? 'variable' : 'estilo'})` });
        break;
      case 'apply-text-style':
        items.push({ ...base, before: textLabel(node), after: fix.styleName });
        break;
      case 'snap-spacing':
        items.push({
          ...base,
          before: fix.changes.map((c) => `${SPACING_LABEL[c.prop]} ${c.from}`).join(' · '),
          after: fix.changes.map((c) => `${SPACING_LABEL[c.prop]} ${c.to}`).join(' · '),
        });
        break;
    }
  }
  return { kind, items };
}
