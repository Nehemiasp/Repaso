// Convierte nodos de Figma en DocNode. Única capa (junto con traverse y catalog) que lee la API.
import { weightFromStyle } from '../shared/fontWeight';
import type { ComponentInfo, DocNode, LayoutInfo, NodeType, Paint, TextInfo } from '../shared/types';

/** Lo único que la lectura necesita del entorno de Figma (se inyecta para poder probarla). */
export interface ReadEnv {
  mixed: unknown;
}

const TYPES: Record<string, NodeType> = {
  FRAME: 'FRAME',
  GROUP: 'GROUP',
  SECTION: 'SECTION',
  TEXT: 'TEXT',
  RECTANGLE: 'RECTANGLE',
  ELLIPSE: 'ELLIPSE',
  POLYGON: 'POLYGON',
  STAR: 'STAR',
  VECTOR: 'VECTOR',
  LINE: 'LINE',
  BOOLEAN_OPERATION: 'BOOLEAN_OPERATION',
  COMPONENT: 'COMPONENT',
  COMPONENT_SET: 'COMPONENT_SET',
  INSTANCE: 'INSTANCE',
};

type AnyPaint = {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: RGB;
  boundVariables?: { color?: { id: string } };
};

export function serializePaints(raw: unknown, env: ReadEnv, styleId?: string): Paint[] {
  if (!Array.isArray(raw)) return [];
  return (raw as AnyPaint[]).map((p): Paint => {
    const visible = p.visible !== false;
    const opacity = p.opacity ?? 1;
    if (p.type === 'SOLID' && p.color) {
      const varId = p.boundVariables?.color?.id;
      return {
        kind: 'solid',
        color: { r: p.color.r, g: p.color.g, b: p.color.b },
        opacity,
        visible,
        ...(styleId ? { styleId } : {}),
        ...(varId ? { variableId: varId } : {}),
      };
    }
    if (p.type.startsWith('GRADIENT')) return { kind: 'gradient', opacity, visible, ...(styleId ? { styleId } : {}) };
    void env;
    return { kind: 'image', opacity, visible };
  });
}

const str = (v: unknown, env: ReadEnv): string | undefined => (typeof v === 'string' && v !== '' && v !== env.mixed ? v : undefined);

// El tipo SceneNode es una unión enorme; en el borde se lee de forma estructural.
type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function textInfo(n: Loose, env: ReadEnv): { text: TextInfo; fills: unknown } {
  const isMixed =
    n.fontSize === env.mixed || n.fontName === env.mixed || n.fontWeight === env.mixed || n.textStyleId === env.mixed || n.fills === env.mixed;
  let fontSize: number = n.fontSize;
  let family: string = n.fontName?.family;
  let weight: number = n.fontWeight;
  let styleId: unknown = n.textStyleId;
  let fills: unknown = n.fills;
  if (isMixed && typeof n.getStyledTextSegments === 'function') {
    const seg = n.getStyledTextSegments(['fontSize', 'fontName', 'fontWeight', 'textStyleId', 'fills'])[0];
    if (seg) {
      fontSize = seg.fontSize;
      family = seg.fontName?.family;
      weight = seg.fontWeight;
      styleId = seg.textStyleId;
      fills = seg.fills;
    }
  }
  const style = str(styleId, env);
  return {
    fills,
    text: {
      characters: String(n.characters ?? ''),
      fontSize: typeof fontSize === 'number' ? fontSize : 0,
      fontFamily: family ?? 'Unknown',
      fontWeight: typeof weight === 'number' ? weight : weightFromStyle(n.fontName?.style ?? ''),
      ...(style ? { textStyleId: style } : {}),
      ...(isMixed ? { mixed: true } : {}),
    },
  };
}

function layoutInfo(n: Loose): LayoutInfo | undefined {
  if (typeof n.layoutMode !== 'string') return undefined;
  const mode = n.layoutMode === 'HORIZONTAL' || n.layoutMode === 'VERTICAL' ? n.layoutMode : 'NONE';
  const num = (v: unknown) => (typeof v === 'number' ? v : 0);
  return {
    mode,
    gap: num(n.itemSpacing),
    ...(n.primaryAxisAlignItems === 'SPACE_BETWEEN' ? { gapAuto: true } : {}),
    padL: num(n.paddingLeft),
    padR: num(n.paddingRight),
    padT: num(n.paddingTop),
    padB: num(n.paddingBottom),
  };
}

async function componentInfo(n: Loose): Promise<ComponentInfo | undefined> {
  if (n.type === 'COMPONENT_SET') {
    const defs: Record<string, { type: string; variantOptions?: string[] }> = n.componentPropertyDefinitions ?? {};
    const variantOptions: Record<string, string[]> = {};
    for (const [name, def] of Object.entries(defs)) {
      if (def.type === 'VARIANT') variantOptions[name] = [...(def.variantOptions ?? [])];
    }
    return { kind: 'set', variantOptions };
  }
  if (n.type === 'COMPONENT') return { kind: 'component' };
  if (n.type === 'INSTANCE') {
    const props: Record<string, string | boolean> = {};
    for (const [name, p] of Object.entries((n.componentProperties ?? {}) as Record<string, { value: unknown }>)) {
      if (typeof p.value === 'string' || typeof p.value === 'boolean') props[name.replace(/#\d+:\d+$/, '')] = p.value;
    }
    const main = typeof n.getMainComponentAsync === 'function' ? await n.getMainComponentAsync() : null;
    const mainName = main ? (main.parent?.type === 'COMPONENT_SET' ? main.parent.name : main.name) : undefined;
    return { kind: 'instance', props, ...(mainName ? { mainName } : {}) };
  }
  return undefined;
}

/** Un nodo de Figma → DocNode. No lee hijos: solo sus ids. */
export async function serializeNode(node: SceneNode, parentId: string | null, inInstance: boolean, env: ReadEnv): Promise<DocNode> {
  const n = node as unknown as Loose;
  const type = TYPES[n.type] ?? 'OTHER';
  const abs = n.absoluteBoundingBox as { x: number; y: number } | null | undefined;
  const width = typeof n.width === 'number' ? n.width : 0;
  const height = typeof n.height === 'number' ? n.height : 0;

  let rawFills: unknown = n.fills;
  let text: TextInfo | undefined;
  if (type === 'TEXT') {
    const t = textInfo(n, env);
    text = t.text;
    rawFills = t.fills;
  }
  const fillStyleId = str(n.fillStyleId, env);
  const fills = serializePaints(rawFills, env, fillStyleId);
  const layout = layoutInfo(n);
  const component = await componentInfo(n);
  const strokes = Array.isArray(n.strokes) ? (n.strokes as AnyPaint[]) : [];

  return {
    id: n.id,
    parentId,
    type,
    name: String(n.name ?? ''),
    visible: n.visible !== false,
    opacity: typeof n.opacity === 'number' ? n.opacity : 1,
    box: { x: abs?.x ?? n.x ?? 0, y: abs?.y ?? n.y ?? 0, width, height },
    fills,
    ...(strokes.some((s) => s.visible !== false) ? { hasStroke: true } : {}),
    ...(typeof n.cornerRadius === 'number' ? { radius: n.cornerRadius } : {}),
    ...(text ? { text } : {}),
    ...(layout ? { layout } : {}),
    ...(component ? { component } : {}),
    ...(inInstance ? { inInstance: true } : {}),
    children: Array.isArray(n.children) ? (n.children as { id: string }[]).map((c) => c.id) : [],
  };
}
