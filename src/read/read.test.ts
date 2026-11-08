import { describe, expect, it, vi } from 'vitest';
import { readScope, TooLargeError } from './traverse';
import { serializeNode, serializePaints, type ReadEnv } from './serialize';
import { readCatalog } from './catalog';

const MIXED = Symbol('mixed');
const env: ReadEnv = { mixed: MIXED };

type M = Record<string, unknown> & { id: string; type: string; children?: M[]; parent?: M | null };
function tree(n: M, parent: M | null = null): M {
  n.parent = parent;
  for (const c of n.children ?? []) tree(c, n);
  return n;
}
const as = (n: M) => n as unknown as SceneNode;
const solid = (r: number, g: number, b: number, extra: object = {}) => ({ type: 'SOLID', color: { r, g, b }, ...extra });

describe('serializePaints', () => {
  it('convierte sólidos, degradados e imágenes', () => {
    const out = serializePaints(
      [solid(1, 0, 0, { opacity: 0.5, boundVariables: { color: { id: 'V:1' } } }), { type: 'GRADIENT_LINEAR', visible: false }, { type: 'IMAGE' }, { type: 'VIDEO' }],
      env,
      'S:1',
    );
    expect(out).toEqual([
      { kind: 'solid', color: { r: 1, g: 0, b: 0 }, opacity: 0.5, visible: true, styleId: 'S:1', variableId: 'V:1' },
      { kind: 'gradient', opacity: 1, visible: false, styleId: 'S:1' },
      { kind: 'image', opacity: 1, visible: true },
      { kind: 'image', opacity: 1, visible: true },
    ]);
  });
  it('mezclado o ausente → []', () => {
    expect(serializePaints(MIXED, env)).toEqual([]);
    expect(serializePaints(undefined, env)).toEqual([]);
  });
  it('degradado sin estilo', () => {
    expect(serializePaints([{ type: 'GRADIENT_RADIAL' }], env)).toEqual([{ kind: 'gradient', opacity: 1, visible: true }]);
  });
});

describe('serializeNode', () => {
  it('lee un frame con auto layout, trazo, radio y estilo de relleno', async () => {
    const f = tree({
      id: '1:1', type: 'FRAME', name: 'Tarjeta', width: 200, height: 100, x: 5, y: 6, absoluteBoundingBox: { x: 50, y: 60 },
      fills: [solid(1, 1, 1)], fillStyleId: 'S:fill', strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }], cornerRadius: 8,
      layoutMode: 'VERTICAL', itemSpacing: 13, paddingLeft: 16, paddingRight: 16, paddingTop: 5, paddingBottom: 5, primaryAxisAlignItems: 'SPACE_BETWEEN',
      opacity: 0.9, children: [{ id: '1:2', type: 'RECTANGLE' }],
    });
    const d = await serializeNode(as(f), null, false, env);
    expect(d).toMatchObject({
      id: '1:1', type: 'FRAME', name: 'Tarjeta', box: { x: 50, y: 60, width: 200, height: 100 }, opacity: 0.9, hasStroke: true, radius: 8,
      layout: { mode: 'VERTICAL', gap: 13, gapAuto: true, padL: 16, padT: 5 }, children: ['1:2'],
    });
    expect(d.fills[0]).toMatchObject({ styleId: 'S:fill' });
  });
  it('tipos desconocidos, sin bounding box ni propiedades → valores por defecto', async () => {
    const d = await serializeNode(as({ id: '9:9', type: 'WEIRD', x: 3, y: 4 }), 'p', true, env);
    expect(d).toMatchObject({ type: 'OTHER', name: '', visible: true, opacity: 1, box: { x: 3, y: 4, width: 0, height: 0 }, inInstance: true, parentId: 'p', fills: [], children: [] });
    expect(d.layout).toBeUndefined();
    const d2 = await serializeNode(as({ id: '9:8', type: 'FRAME', visible: false, layoutMode: 'GRID', cornerRadius: MIXED }), null, false, env);
    expect(d2).toMatchObject({ visible: false, layout: { mode: 'NONE', gap: 0 } });
    expect(d2.radius).toBeUndefined();
    expect(d2.box).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
  it('texto simple', async () => {
    const d = await serializeNode(as({ id: 't', type: 'TEXT', characters: 'Hola', fontSize: 16, fontName: { family: 'Inter', style: 'Bold' }, fontWeight: 700, textStyleId: 'S:t', fills: [solid(0, 0, 0)] }), null, false, env);
    expect(d.text).toEqual({ characters: 'Hola', fontSize: 16, fontFamily: 'Inter', fontWeight: 700, textStyleId: 'S:t' });
  });
  it('texto mezclado: lee el primer tramo y lo marca', async () => {
    const seg = { fontSize: 12, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, textStyleId: '', fills: [solid(0, 0, 0)] };
    const d = await serializeNode(as({ id: 't', type: 'TEXT', characters: 'a b', fontSize: MIXED, fontName: MIXED, fontWeight: MIXED, textStyleId: MIXED, fills: MIXED, getStyledTextSegments: () => [seg] }), null, false, env);
    expect(d.text).toEqual({ characters: 'a b', fontSize: 12, fontFamily: 'Inter', fontWeight: 400, mixed: true });
    expect(d.fills).toHaveLength(1);
  });
  it('texto mezclado sin tramos o sin función: no se rompe', async () => {
    const d = await serializeNode(as({ id: 't', type: 'TEXT', fontSize: MIXED, fontName: MIXED, getStyledTextSegments: () => [] }), null, false, env);
    expect(d.text).toMatchObject({ fontSize: 0, fontFamily: 'Unknown', mixed: true });
    const d2 = await serializeNode(as({ id: 't', type: 'TEXT', fontSize: 14, fontName: { family: 'A', style: 'Semi Bold' }, fontWeight: MIXED }), null, false, env);
    expect(d2.text).toMatchObject({ fontSize: 14, fontWeight: 600 });
    const d3 = await serializeNode(as({ id: 't', type: 'TEXT', fontSize: 14, fontName: { family: 'A', style: 'Bold' }, fontWeight: undefined }), null, false, env);
    expect(d3.text).toMatchObject({ fontWeight: 700 });
  });
  it('set de componentes: opciones de las propiedades de variante', async () => {
    const d = await serializeNode(
      as({ id: 's', type: 'COMPONENT_SET', componentPropertyDefinitions: { State: { type: 'VARIANT', variantOptions: ['Default', 'Hover'] }, Label: { type: 'TEXT' }, Size: { type: 'VARIANT' } } }),
      null, false, env,
    );
    expect(d.component).toEqual({ kind: 'set', variantOptions: { State: ['Default', 'Hover'], Size: [] } });
    const d2 = await serializeNode(as({ id: 's', type: 'COMPONENT_SET' }), null, false, env);
    expect(d2.component).toEqual({ kind: 'set', variantOptions: {} });
  });
  it('componente suelto', async () => {
    expect((await serializeNode(as({ id: 'c', type: 'COMPONENT' }), null, false, env)).component).toEqual({ kind: 'component' });
  });
  it('instancia: propiedades y nombre del componente (o de su set)', async () => {
    const mk = (main: unknown) =>
      as({ id: 'i', type: 'INSTANCE', componentProperties: { 'State#1:0': { value: 'Hover' }, Disabled: { value: true }, Count: { value: 3 } }, getMainComponentAsync: async () => main });
    const a = await serializeNode(mk({ name: 'State=Hover', parent: { type: 'COMPONENT_SET', name: 'Botón' } }), null, false, env);
    expect(a.component).toEqual({ kind: 'instance', props: { State: 'Hover', Disabled: true }, mainName: 'Botón' });
    const b = await serializeNode(mk({ name: 'Ícono', parent: { type: 'FRAME' } }), null, false, env);
    expect(b.component?.mainName).toBe('Ícono');
    const c = await serializeNode(mk({ name: 'Solo' }), null, false, env);
    expect(c.component?.mainName).toBe('Solo');
    const d = await serializeNode(mk(null), null, false, env);
    expect(d.component?.mainName).toBeUndefined();
    const e = await serializeNode(as({ id: 'i', type: 'INSTANCE' }), null, false, env);
    expect(e.component).toEqual({ kind: 'instance', props: {} });
  });
});

describe('readScope', () => {
  const page: M = { id: '0:1', type: 'PAGE' };
  const make = () =>
    tree({ id: 'p', type: 'PAGE', children: [{ id: 'a', type: 'FRAME', children: [{ id: 'b', type: 'RECTANGLE' }, { id: 'c', type: 'TEXT', characters: 'x', fontSize: 12, fontName: { family: 'Inter', style: 'Regular' } }] }] });

  it('lee la selección con sus hijos y deja el contexto aparte', async () => {
    const p = make();
    const c = p.children![0]!.children![1]!;
    const scene = await readScope({ env, roots: [as(c)], skipHidden: true });
    // Raíz: el texto. Contexto: el frame padre y el hermano de abajo (b).
    expect(scene!.rootIds).toEqual(['c']);
    expect(Object.keys(scene!.nodes).sort()).toEqual(['a', 'b', 'c']);
    expect(scene!.nodes.c!.parentId).toBe('a');
    expect(scene!.nodes.a!.parentId).toBeNull();
  });
  it('lee una página completa en orden', async () => {
    const p = make();
    const scene = await readScope({ env, roots: p.children!.map(as), skipHidden: true });
    expect(scene!.rootIds).toEqual(['a']);
    expect(Object.keys(scene!.nodes).sort()).toEqual(['a', 'b', 'c']);
    expect(scene!.nodes.a!.parentId).toBeNull();
  });
  it('quita raíces anidadas en otra raíz', async () => {
    const p = make();
    const a = p.children![0]!;
    const scene = await readScope({ env, roots: [as(a.children![0]!), as(a)], skipHidden: true });
    expect(scene!.rootIds).toEqual(['a']);
  });
  it('no entra en capas ocultas si se pide', async () => {
    const p = tree({ id: 'p', type: 'PAGE', children: [{ id: 'a', type: 'FRAME', visible: false, children: [{ id: 'b', type: 'RECTANGLE' }] }] });
    const s1 = await readScope({ env, roots: p.children!.map(as), skipHidden: true });
    expect(Object.keys(s1!.nodes)).toEqual(['a']);
    const s2 = await readScope({ env, roots: p.children!.map(as), skipHidden: false });
    expect(Object.keys(s2!.nodes).sort()).toEqual(['a', 'b']);
  });
  it('marca lo que está dentro de instancias', async () => {
    const p = tree({ id: 'p', type: 'PAGE', children: [{ id: 'i', type: 'INSTANCE', children: [{ id: 'x', type: 'FRAME', children: [{ id: 'y', type: 'RECTANGLE' }] }] }] });
    const s = await readScope({ env, roots: p.children!.map(as), skipHidden: true });
    expect(s!.nodes.i!.inInstance).toBeUndefined();
    expect(s!.nodes.x!.inInstance).toBe(true);
    expect(s!.nodes.y!.inInstance).toBe(true);
    // Raíz seleccionada dentro de una instancia: hereda la marca y el contexto también.
    const s2 = await readScope({ env, roots: [as(p.children![0]!.children![0]!)], skipHidden: true });
    expect(s2!.nodes.x!.inInstance).toBe(true);
    expect(s2!.nodes.i!.inInstance).toBe(true);
  });
  it('falla con TooLargeError si pasa del límite', async () => {
    const kids = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, type: 'RECTANGLE' }));
    const p = tree({ id: 'p', type: 'PAGE', children: kids });
    await expect(readScope({ env, roots: p.children!.map(as), skipHidden: true, maxNodes: 5 })).rejects.toBeInstanceOf(TooLargeError);
    await expect(readScope({ env, roots: p.children!.map(as), skipHidden: true, maxNodes: 5 })).rejects.toThrow('supera');
  });
  it('cede el hilo por trozos, reporta progreso y es cancelable', async () => {
    const kids = Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, type: 'RECTANGLE' }));
    const p = tree({ id: 'p', type: 'PAGE', children: kids });
    let t = 0;
    const yieldFn = vi.fn(async () => {});
    const onProgress = vi.fn();
    const s = await readScope({ env, roots: p.children!.map(as), skipHidden: true, budgetMs: 5, now: () => (t += 3), yieldFn, onProgress });
    expect(s).not.toBeNull();
    expect(yieldFn).toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith(6);

    const signal = { cancelled: false };
    t = 0;
    const r = await readScope({ env, roots: p.children!.map(as), skipHidden: true, budgetMs: 1, now: () => (t += 2), yieldFn: async () => { signal.cancelled = true; }, signal });
    expect(r).toBeNull();
    const r2 = await readScope({ env, roots: p.children!.map(as), skipHidden: true, budgetMs: 1e9, signal: { cancelled: true } });
    expect(r2).toBeNull();
  });
  it('usa el yield por defecto con presupuesto 0', async () => {
    const p = make();
    const s = await readScope({ env, roots: p.children!.map(as), skipHidden: true, budgetMs: 0 });
    expect(s!.rootIds).toEqual(['a']);
  });
  it('tolera una raíz sin padre y no repite contexto', async () => {
    const lone = tree({ id: 'l', type: 'FRAME' });
    const s = await readScope({ env, roots: [as(lone)], skipHidden: true });
    expect(Object.keys(s!.nodes)).toEqual(['l']);
    void page;
    // Dos raíces hermanas comparten padre: el padre se lee una sola vez.
    const p = tree({ id: 'p', type: 'FRAME', children: [{ id: 'x', type: 'RECTANGLE' }, { id: 'y', type: 'RECTANGLE' }] });
    const s2 = await readScope({ env, roots: p.children!.map(as), skipHidden: true });
    expect(Object.keys(s2!.nodes).sort()).toEqual(['p', 'x', 'y']);
  });
});

describe('readCatalog', () => {
  it('junta estilos de color, de texto y variables locales', async () => {
    vi.stubGlobal('figma', {
      getLocalPaintStylesAsync: async () => [
        { id: 'S:1', name: 'Azul', paints: [{ type: 'SOLID', color: { r: 0, g: 0.2, b: 0.4 } }] },
        { id: 'S:2', name: 'Degradado', paints: [{ type: 'GRADIENT_LINEAR' }] },
      ],
      getLocalTextStylesAsync: async () => [{ id: 'S:t', name: 'Cuerpo', fontName: { family: 'Inter', style: 'Semi Bold' }, fontSize: 16 }],
      variables: {
        getLocalVariablesAsync: async () => [
          { id: 'V:1', name: 'brand', variableCollectionId: 'C:1', valuesByMode: { m1: { r: 1, g: 0, b: 0, a: 1 } } },
          { id: 'V:2', name: 'alias', variableCollectionId: 'C:1', valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'V:1' } } },
          { id: 'V:3', name: 'sinModo', variableCollectionId: 'C:2', valuesByMode: {} },
        ],
        getVariableCollectionByIdAsync: async (id: string) => (id === 'C:1' ? { defaultModeId: 'm1' } : null),
      },
    });
    const c = await readCatalog();
    vi.unstubAllGlobals();
    expect(c.colors).toEqual([
      { id: 'S:1', name: 'Azul', color: { r: 0, g: 0.2, b: 0.4 }, source: 'style' },
      { id: 'V:1', name: 'brand', color: { r: 1, g: 0, b: 0 }, source: 'variable' },
    ]);
    expect(c.texts).toEqual([{ id: 'S:t', name: 'Cuerpo', fontFamily: 'Inter', fontSize: 16, fontWeight: 600 }]);
  });
});
