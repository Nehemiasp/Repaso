import { fmt } from '../format';
import { isInteractive } from '../interactive';
import { makeFinding, type Rule } from './types';

const meta = { id: 'touch-target', category: 'accessibility', severity: 'high' } as const;

export const touchTargetRule: Rule = {
  ...meta,
  checkNode(node, { scene, settings }) {
    if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return [];
    if (!isInteractive(node, scene)) return [];
    const { width, height } = node.box;
    if (width >= settings.minTouchTarget && height >= settings.minTouchTarget) return [];
    return [
      makeFinding(meta, node, {
        message: `Área táctil de ${fmt(width)} × ${fmt(height)} px`,
        detail: `Lo recomendado es al menos ${settings.minTouchTarget} × ${settings.minTouchTarget} px.`,
      }),
    ];
  },
};
