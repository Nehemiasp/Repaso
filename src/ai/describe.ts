// Describe capas con lo mínimo necesario para la IA: tipo, nombre, hijos, textos y posición. Nunca imágenes.
import { clip } from '../engine/format';
import { effectiveName, isInteractiveName } from '../engine/interactive';
import { isDefaultName } from '../engine/naming';
import { toHex } from '../engine/color';
import type { DocNode, Scene } from '../shared/types';

export interface LayerDescription {
  type: string;
  name: string;
  size: string;
  layout?: string;
  /** Posición relativa al padre, en %. */
  position?: string;
  parent?: string;
  children: string[];
}

const topHex = (n: DocNode): string | undefined => {
  const f = [...n.fills].reverse().find((p) => p.kind === 'solid' && p.visible);
  return f && f.kind === 'solid' ? toHex(f.color) : undefined;
};

export function describeLayer(node: DocNode, scene: Scene): LayerDescription {
  const parent = node.parentId ? scene.nodes[node.parentId] : undefined;
  const kids = node.children
    .map((id) => scene.nodes[id])
    .filter((c): c is DocNode => !!c && c.visible)
    .slice(0, 8)
    .map((c) => {
      if (c.type === 'TEXT') return `TEXT «${clip(c.text?.characters ?? '', 40)}»`;
      return `${c.type}${isDefaultName(c.name) ? '' : ` «${clip(c.name, 30)}»`}`;
    });
  return {
    type: node.type,
    name: node.name,
    size: `${Math.round(node.box.width)}×${Math.round(node.box.height)}`,
    ...(node.layout && node.layout.mode !== 'NONE' ? { layout: node.layout.mode === 'HORIZONTAL' ? 'fila' : 'columna' } : {}),
    ...(parent && parent.box.width > 0 && parent.box.height > 0
      ? { position: `${Math.round(((node.box.x - parent.box.x) / parent.box.width) * 100)}%, ${Math.round(((node.box.y - parent.box.y) / parent.box.height) * 100)}%` }
      : {}),
    ...(parent ? { parent: `${parent.type} «${clip(parent.name, 40)}»` } : {}),
    children: kids,
  };
}

/** Resumen visual de una variante de componente: solo colores y forma, sin imágenes. */
export function describeVariant(node: DocNode, scene: Scene): Record<string, unknown> {
  const text = node.children.map((id) => scene.nodes[id]).find((c) => c?.type === 'TEXT');
  return {
    variante: node.name,
    fondo: topHex(node) ?? 'sin relleno',
    ...(text && topHex(text) ? { colorTexto: topHex(text) } : {}),
    trazo: node.hasStroke ? 'sí' : 'no',
    ...(node.radius !== undefined ? { radio: node.radius } : {}),
    opacidad: node.opacity,
  };
}

/** ¿Es la etiqueta de un botón? Mira hasta 3 niveles hacia arriba. */
export function isButtonLabel(node: DocNode, scene: Scene): boolean {
  let cur: DocNode | undefined = node.parentId ? scene.nodes[node.parentId] : undefined;
  for (let i = 0; cur && i < 3; i++) {
    if (isInteractiveName(effectiveName(cur, scene)) || (cur.component?.mainName && isInteractiveName(cur.component.mainName))) return true;
    cur = cur.parentId ? scene.nodes[cur.parentId] : undefined;
  }
  return false;
}
