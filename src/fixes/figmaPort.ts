// Implementación real del puerto: la única parte de las correcciones que toca la API de Figma.
import type { FixNode, FixPort } from './apply';

export const figmaPort: FixPort = {
  async getNode(id) {
    const n = await figma.getNodeByIdAsync(id);
    return n && !n.removed ? (n as unknown as FixNode) : null;
  },
  async getTextStyleFont(id) {
    const s = await figma.getStyleByIdAsync(id);
    return s && s.type === 'TEXT' ? (s as TextStyle).fontName : null;
  },
  getVariable: (id) => figma.variables.getVariableByIdAsync(id),
  loadFont: (font) => figma.loadFontAsync(font as FontName),
  bindColor: (paint, variable) => figma.variables.setBoundVariableForPaint(paint as SolidPaint, 'color', variable as Variable),
  commitUndo: () => figma.commitUndo(),
};
