import { fmt } from '../format';
import { makeFinding, type Rule } from './types';

const meta = { id: 'text-small', category: 'accessibility', severity: 'medium' } as const;

export const textSmallRule: Rule = {
  ...meta,
  checkNode(node, { settings }) {
    if (node.type !== 'TEXT' || !node.text) return [];
    const size = node.text.fontSize;
    if (size >= settings.minTextSize) return [];
    return [
      makeFinding(meta, node, {
        severity: size < 10 ? 'high' : 'medium',
        message: `Texto muy pequeño (${fmt(size, size % 1 ? 1 : 0)} px)`,
        detail: `El mínimo configurado es ${settings.minTextSize} px.`,
        suggestion: { text: `Suba el texto a ${settings.minTextSize} px o más.` },
      }),
    ];
  },
};
