import type { DocNode, Scene } from '../shared/types';

/** Nombres que Figma pone por defecto: «Frame 482», «Rectangle 12», «Vector»… */
const DEFAULT_NAME =
  /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Image|Section|Slice|Component|Boolean|Union|Subtract|Intersect|Exclude|Arrow)(\s+\d+)?$/i;

export function isDefaultName(name: string): boolean {
  return DEFAULT_NAME.test(name.trim());
}

const kids = (node: DocNode, scene: Scene): DocNode[] =>
  node.children.map((id) => scene.nodes[id]).filter((c): c is DocNode => !!c && c.visible);

const hasSolid = (n: DocNode) => n.fills.some((f) => f.kind === 'solid' && f.visible);
const hasImage = (n: DocNode) => n.fills.some((f) => f.kind === 'image' && f.visible);
const nearlySquare = (n: DocNode) => Math.abs(n.box.width - n.box.height) <= 1;

/**
 * Nombre por tipo, sin IA: «Botón / Relleno», «Tarjeta», «Fila»…
 * Es una heurística segura: si no reconoce la forma, usa el tipo genérico.
 */
export function suggestNameByType(node: DocNode, scene: Scene): string {
  const parent = node.parentId ? scene.nodes[node.parentId] : undefined;
  switch (node.type) {
    case 'RECTANGLE': {
      if (hasImage(node)) return 'Imagen';
      const big = !!parent && node.box.width >= parent.box.width * 0.9 && node.box.height >= parent.box.height * 0.9;
      return big ? 'Fondo' : 'Rectángulo';
    }
    case 'ELLIPSE':
      if (hasImage(node) && nearlySquare(node) && node.box.width <= 64) return 'Avatar';
      return nearlySquare(node) ? 'Círculo' : 'Elipse';
    case 'LINE':
      return 'Divisor';
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'STAR':
    case 'POLYGON':
      return Math.max(node.box.width, node.box.height) <= 32 ? 'Ícono' : 'Vector';
    case 'GROUP':
      return 'Grupo';
    case 'SECTION':
      return 'Sección';
    default:
      break;
  }
  const children = kids(node, scene);
  const texts = children.filter((c) => c.type === 'TEXT');
  const icons = children.filter((c) => ['VECTOR', 'BOOLEAN_OPERATION'].includes(c.type) && c.box.width <= 24);
  const isButton =
    texts.length === 1 &&
    texts.length + icons.length === children.length &&
    node.box.height <= 64 &&
    (hasSolid(node) || node.hasStroke === true);
  if (isButton) return hasSolid(node) ? 'Botón / Relleno' : 'Botón / Contorno';
  if (!parent && node.box.width >= 320 && node.box.height >= 480) return 'Pantalla';
  if (hasSolid(node) && (node.radius ?? 0) > 0 && node.layout?.mode === 'VERTICAL' && children.length >= 2) return 'Tarjeta';
  if (node.layout?.mode === 'HORIZONTAL') return 'Fila';
  if (node.layout?.mode === 'VERTICAL') return 'Columna';
  return 'Contenedor';
}
