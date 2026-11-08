import { blend, contrastRatio, luminance, toHex } from '../color';
import { isLargeText, requiredRatio, resolveBackground, suggestForeground, topFill } from '../contrast';
import { fmt } from '../format';
import { makeFinding, type Rule } from './types';

const meta = { id: 'contrast', category: 'accessibility', severity: 'high' } as const;

export const contrastRule: Rule = {
  ...meta,
  checkNode(node, { scene, settings }) {
    if (node.type !== 'TEXT' || !node.text) return [];
    const fg = topFill(node);
    if (fg.kind === 'none') return [];
    const unverifiable = (reason: string) => [
      makeFinding(meta, node, {
        severity: 'low',
        status: 'unverifiable',
        message: 'No se pudo verificar el contraste',
        detail: `No se puede calcular porque ${reason}. Revíselo a mano.`,
      }),
    ];
    if (fg.kind === 'unverifiable') {
      return unverifiable(fg.reason.replace('detrás', 'en el texto'));
    }
    const bg = resolveBackground(scene, node);
    if (bg.kind === 'unverifiable') return unverifiable(bg.reason);

    const color = blend(fg.layer.color, fg.layer.alpha, bg.color);
    const ratio = contrastRatio(color, bg.color);
    const large = isLargeText(node.text.fontSize, node.text.fontWeight);
    const required = requiredRatio(settings.contrastLevel, large);
    if (ratio >= required) return [];
    const s = suggestForeground(color, bg.color, required);
    const suggestion = s
      ? {
          text: `${luminance(s.color) < luminance(color) ? 'Oscurezca' : 'Aclare'} el texto a ${toHex(s.color)} (${fmt(s.ratio, 1)}:1).`,
          color: toHex(s.color),
        }
      : { text: 'Ningún color de texto llega a ese nivel sobre este fondo: cambie el fondo.' };
    return [
      makeFinding(meta, node, {
        severity: ratio < 3 ? 'critical' : 'high',
        message: `Contraste insuficiente (${fmt(ratio, 2)}:1)`,
        detail: `Nivel ${settings.contrastLevel} pide ${fmt(required, 1)}:1 para texto ${large ? 'grande' : 'normal'}.`,
        suggestion,
      }),
    ];
  },
};
