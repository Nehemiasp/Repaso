import { weightFromStyle } from '../shared/fontWeight';
import type { ColorStyleInfo, StyleCatalog, TextStyleInfo } from '../shared/types';

/**
 * Estilos y variables LOCALES del archivo. Los de bibliotecas externas no se
 * listan: la API solo los entrega si el archivo ya los usa (limitación conocida).
 */
export async function readCatalog(): Promise<StyleCatalog> {
  const colors: ColorStyleInfo[] = [];
  const texts: TextStyleInfo[] = [];

  for (const s of await figma.getLocalPaintStylesAsync()) {
    const p = s.paints.find((x): x is SolidPaint => x.type === 'SOLID' && x.visible !== false);
    if (p) colors.push({ id: s.id, name: s.name, color: { r: p.color.r, g: p.color.g, b: p.color.b }, source: 'style' });
  }

  for (const s of await figma.getLocalTextStylesAsync()) {
    texts.push({
      id: s.id,
      name: s.name,
      fontFamily: s.fontName.family,
      fontSize: s.fontSize,
      fontWeight: weightFromStyle(s.fontName.style),
    });
  }

  const collections = new Map<string, string>();
  for (const v of await figma.variables.getLocalVariablesAsync('COLOR')) {
    let modeId = collections.get(v.variableCollectionId);
    if (!modeId) {
      const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
      modeId = c?.defaultModeId ?? '';
      collections.set(v.variableCollectionId, modeId);
    }
    const value = v.valuesByMode[modeId];
    // Las variables que son alias de otra no se resuelven aquí.
    if (value && typeof value === 'object' && 'r' in value) {
      colors.push({ id: v.id, name: v.name, color: { r: value.r, g: value.g, b: value.b }, source: 'variable' });
    }
  }
  return { colors, texts };
}
