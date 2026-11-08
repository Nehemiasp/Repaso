import { spacingChanges } from '../spacing';
import { makeFinding, type Rule } from './types';

const meta = { id: 'spacing-off-scale', category: 'spacing', severity: 'medium' } as const;

const LABEL = { gap: 'espacio', padL: 'relleno izq.', padR: 'relleno der.', padT: 'relleno sup.', padB: 'relleno inf.' } as const;

export const spacingRule: Rule = {
  ...meta,
  checkNode(node, { settings }) {
    if (!node.layout || node.inInstance) return [];
    const changes = spacingChanges(node.layout, settings.spacingGrid);
    if (changes.length === 0) return [];
    const list = changes.map((c) => `${LABEL[c.prop]} ${c.from} → ${c.to}`).join(', ');
    return [
      makeFinding(meta, node, {
        message: `Espaciado fuera de la rejilla de ${settings.spacingGrid} px`,
        detail: list,
        fix: { kind: 'snap-spacing', changes },
      }),
    ];
  },
};
