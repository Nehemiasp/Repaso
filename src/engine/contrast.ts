import type { ContrastLevel, DocNode, Rgb, Scene } from '../shared/types';
import { blend, contrastRatio, luminance } from './color';

export type Background =
  | { kind: 'color'; color: Rgb }
  | { kind: 'unverifiable'; reason: string };

interface Layer {
  color: Rgb;
  alpha: number;
}

export type LayerResult = { kind: 'layer'; layer: Layer } | { kind: 'none' } | { kind: 'unverifiable'; reason: string };

/** Relleno visible más alto (el último del arreglo) de un nodo. */
export function topFill(node: DocNode): LayerResult {
  for (let i = node.fills.length - 1; i >= 0; i--) {
    const f = node.fills[i]!;
    if (!f.visible || f.opacity === 0) continue;
    if (f.kind !== 'solid') {
      return {
        kind: 'unverifiable',
        reason: f.kind === 'image' ? 'hay una imagen detrás' : 'hay un degradado detrás',
      };
    }
    return { kind: 'layer', layer: { color: f.color, alpha: f.opacity * node.opacity } };
  }
  return { kind: 'none' };
}

function contains(outer: DocNode, inner: DocNode): boolean {
  const a = outer.box;
  const b = inner.box;
  return a.x <= b.x && a.y <= b.y && a.x + a.width >= b.x + b.width && a.y + a.height >= b.y + b.height;
}

/**
 * Fondo real detrás de un texto: sube por los padres con relleno sólido y,
 * en cada nivel, mira antes los hermanos de abajo que lo cubren por completo
 * (el típico rectángulo de fondo). Si encuentra imagen o degradado, o llega
 * a la raíz sin un fondo opaco, devuelve «no verificable»: nunca asume blanco.
 */
export function resolveBackground(scene: Scene, node: DocNode): Background {
  const layers: Layer[] = [];
  const push = (r: LayerResult): Background | null => {
    if (r.kind === 'unverifiable') return { kind: 'unverifiable', reason: r.reason };
    if (r.kind === 'layer') {
      layers.push(r.layer);
      if (r.layer.alpha >= 0.999) return compose(layers);
    }
    return null;
  };

  let current = node;
  while (current.parentId !== null) {
    const parent = scene.nodes[current.parentId];
    if (!parent) break;
    const idx = parent.children.indexOf(current.id);
    for (let i = idx - 1; i >= 0; i--) {
      const sib = scene.nodes[parent.children[i]!];
      if (!sib || !sib.visible || sib.type === 'TEXT' || !contains(sib, node)) continue;
      const done = push(topFill(sib));
      if (done) return done;
    }
    const done = push(topFill(parent));
    if (done) return done;
    current = parent;
  }
  return { kind: 'unverifiable', reason: 'no hay un fondo sólido detrás' };
}

function compose(layers: Layer[]): Background {
  // layers[0] es el más cercano al texto; el último es opaco.
  let acc = layers[layers.length - 1]!.color;
  for (let i = layers.length - 2; i >= 0; i--) {
    const l = layers[i]!;
    acc = blend(l.color, l.alpha, acc);
  }
  return { kind: 'color', color: acc };
}

/** Texto grande según WCAG: ≥24 px, o ≥18,66 px en negrita. */
export function isLargeText(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
}

export function requiredRatio(level: ContrastLevel, large: boolean): number {
  if (level === 'AAA') return large ? 4.5 : 7;
  return large ? 3 : 4.5;
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 1, g: 1, b: 1 };
const quantize = (c: Rgb): Rgb => ({ r: Math.round(c.r * 255) / 255, g: Math.round(c.g * 255) / 255, b: Math.round(c.b * 255) / 255 });

/**
 * Color de texto más cercano al actual que llega al contraste pedido sobre `bg`: se mueve hacia negro o
 * hacia blanco (el que primero alcanza el nivel; sobre fondo claro, negro) lo mínimo necesario.
 * Devuelve null si ni negro ni blanco llegan (por ejemplo, AAA sobre un gris medio): ahí hay que cambiar el fondo.
 */
export function suggestForeground(fg: Rgb, bg: Rgb, required: number): { color: Rgb; ratio: number } | null {
  const targets = luminance(bg) > 0.179 ? [BLACK, WHITE] : [WHITE, BLACK];
  for (const target of targets) {
    if (contrastRatio(target, bg) < required) continue;
    // Se compara el color ya redondeado a 8 bits: es el que Figma va a guardar.
    const at = (t: number) => quantize(blend(target, t, fg));
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (contrastRatio(at(mid), bg) >= required) hi = mid;
      else lo = mid;
    }
    const color = at(hi);
    return { color, ratio: contrastRatio(color, bg) };
  }
  return null;
}

export { contrastRatio };
