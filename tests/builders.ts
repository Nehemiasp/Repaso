// Ayudas para fabricar escenas en pruebas y en los fixtures. No se incluyen en el plugin.
import { fromHex } from '../src/engine/color';
import { DEFAULT_SETTINGS } from '../src/shared/constants';
import type {
  Box,
  ColorStyleInfo,
  DocNode,
  NodeType,
  Paint,
  Scene,
  Settings,
  StyleCatalog,
  TextStyleInfo,
} from '../src/shared/types';

export interface Spec extends Partial<Omit<DocNode, 'id' | 'type' | 'children' | 'parentId'>> {
  id: string;
  type: NodeType;
  kids?: Spec[];
}

export const solid = (hex: string, opacity = 1, extra: { styleId?: string; variableId?: string } = {}): Paint => ({
  kind: 'solid',
  color: fromHex(hex),
  opacity,
  visible: true,
  ...extra,
});
export const image = (): Paint => ({ kind: 'image', opacity: 1, visible: true });
export const gradient = (): Paint => ({ kind: 'gradient', opacity: 1, visible: true });

export const box = (width: number, height: number, x = 0, y = 0): Box => ({ x, y, width, height });

type Props = Omit<Spec, 'id' | 'type' | 'kids'>;

export const frame = (id: string, props: Props = {}, kids: Spec[] = []): Spec => ({ id, type: 'FRAME', ...props, kids });
export const rect = (id: string, props: Props = {}): Spec => ({ id, type: 'RECTANGLE', ...props });
export const text = (
  id: string,
  characters: string,
  props: Props & { fontSize?: number; fontWeight?: number; fontFamily?: string; textStyleId?: string } = {},
): Spec => {
  const { fontSize = 16, fontWeight = 400, fontFamily = 'Inter', textStyleId, ...rest } = props;
  return {
    id,
    type: 'TEXT',
    name: characters,
    fills: [solid('#111111')],
    box: box(120, 24),
    ...rest,
    text: { characters, fontSize, fontFamily, fontWeight, ...(textStyleId ? { textStyleId } : {}) },
  };
};
export const node = (id: string, type: NodeType, props: Props = {}, kids: Spec[] = []): Spec => ({ id, type, ...props, kids });

export function scene(...roots: Spec[]): Scene {
  const nodes: Record<string, DocNode> = {};
  const add = (s: Spec, parentId: string | null): void => {
    const { kids = [], id, type, ...rest } = s;
    nodes[id] = {
      name: id,
      visible: true,
      opacity: 1,
      box: box(100, 100),
      fills: [],
      ...rest,
      id,
      type,
      parentId,
      children: kids.map((k) => k.id),
    };
    for (const k of kids) add(k, id);
  };
  for (const r of roots) add(r, null);
  return { rootIds: roots.map((r) => r.id), nodes };
}

export function catalog(opts: { colors?: [string, string, ('style' | 'variable')?][]; texts?: [string, string, number, number?][] } = {}): StyleCatalog {
  const colors: ColorStyleInfo[] = (opts.colors ?? []).map(([name, hex, source], i) => ({
    id: `${source === 'variable' ? 'VariableID' : 'S'}:color${i}`,
    name,
    color: fromHex(hex),
    source: source ?? 'style',
  }));
  const texts: TextStyleInfo[] = (opts.texts ?? []).map(([name, family, size, weight], i) => ({
    id: `S:text${i}`,
    name,
    fontFamily: family,
    fontSize: size,
    fontWeight: weight ?? 400,
  }));
  return { colors, texts };
}

export const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over, rules: { ...DEFAULT_SETTINGS.rules, ...(over.rules ?? {}) } });
