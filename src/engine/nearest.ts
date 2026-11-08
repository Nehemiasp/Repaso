import type { ColorStyleInfo, Rgb, StyleCatalog, TextStyleInfo } from '../shared/types';
import { deltaE2000 } from './color';

export interface NearestColor {
  style: ColorStyleInfo;
  deltaE: number;
}

/**
 * Estilo o variable de color más cercano. En empate gana la variable
 * (es lo que Figma recomienda hoy); luego el orden del catálogo.
 */
export function nearestColor(color: Rgb, catalog: StyleCatalog): NearestColor | null {
  let best: NearestColor | null = null;
  for (const style of catalog.colors) {
    const d = deltaE2000(color, style.color);
    if (!best || d < best.deltaE || (d === best.deltaE && style.source === 'variable' && best.style.source === 'style')) {
      best = { style, deltaE: d };
    }
  }
  return best;
}

export interface TextShape {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
}

/** Costo de parecido: familia distinta 3, cada px 1, cada 100 de peso 0,5. */
export function textDistance(a: TextShape, b: TextShape): number {
  return (
    (a.fontFamily === b.fontFamily ? 0 : 3) +
    Math.abs(a.fontSize - b.fontSize) +
    Math.abs(a.fontWeight - b.fontWeight) / 200
  );
}

/** Más allá de este costo no se sugiere estilo: sería forzarlo. */
export const TEXT_STYLE_MAX_DISTANCE = 6;

export function nearestTextStyle(text: TextShape, catalog: StyleCatalog): TextStyleInfo | null {
  let best: TextStyleInfo | null = null;
  let bestD = Infinity;
  for (const s of catalog.texts) {
    const d = textDistance(text, s);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best && bestD <= TEXT_STYLE_MAX_DISTANCE ? best : null;
}
