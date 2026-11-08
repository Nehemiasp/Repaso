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
        suggestion: {
          text: `Deje al menos ${settings.minTouchTarget} px de alto y de ancho. En un botón con texto, mantenga el alto en ${settings.minTouchTarget} px y deje que el ancho se ajuste al texto, sin forzar un cuadrado.`,
        },
      }),
    ];
  },
};
