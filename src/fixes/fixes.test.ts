import { describe, expect, it, vi } from 'vitest';
import { runRules } from '../engine';
import { box, catalog, frame, rect, scene, settings, solid, text } from '../../tests/builders';
import { applyFixes, type FixNode, type FixPort } from './apply';
import { buildPreview } from './preview';
import type { Finding, Scene } from '../shared/types';

const cat = catalog({
  colors: [['Marca/Azul', '#043565'], ['Var/Fondo', '#FFFFFF', 'variable']],
  texts: [['Cuerpo', 'Inter', 16, 400]],
});

const sc = scene(
  frame('root', { name: 'Raíz', fills: [solid('#FFFFFF', 1, { styleId: 'S:bg' })], box: box(400, 400) }, [
    frame('f', { name: 'Frame 1', box: box(100, 100), layout: { mode: 'VERTICAL', gap: 13, padL: 16, padR: 16, padT: 10, padB: 16 } }, [text('t', 'Hola', { fontSize: 16, fills: [solid('#111111', 1, { styleId: 'S:c' })] })]),
    rect('near', { name: 'Casi azul', fills: [solid('#073A6A')] }),
    rect('white', { name: 'Blanco', fills: [solid('#FFFFFF')] }),
  ]),
);
const findings = runRules(sc, cat, settings()).findings;
const by = (id: string) => findings.find((f) => f.id === id) as Finding;

describe('buildPreview', () => {
  it('renombrar: antes → después, por tipo', () => {
    const p = buildPreview('rename', findings, sc);
    expect(p.items).toEqual([{ findingId: 'layer-default-name:f', nodeId: 'f', nodeName: 'Frame 1', before: 'Frame 1', after: 'Columna', source: 'type' }]);
  });
  it('renombrar: los nombres de la IA tienen prioridad', () => {
    const p = buildPreview('rename', findings, sc, { aiNames: { 'layer-default-name:f': 'Tarjeta / Producto' } });
    expect(p.items[0]).toMatchObject({ after: 'Tarjeta / Producto', source: 'ai' });
  });
  it('color: hex actual → estilo o variable', () => {
    const p = buildPreview('apply-color', findings, sc);
    expect(p.items.map((i) => [i.nodeId, i.before, i.after])).toEqual([
      ['near', '#073A6A', 'Marca/Azul (estilo)'],
      ['white', '#FFFFFF', 'Var/Fondo (variable)'],
    ]);
  });
  it('color: nodo ausente o sin relleno sólido muestra «—»', () => {
    const p = buildPreview('apply-color', [by('color-near-style:near')], { rootIds: [], nodes: {} } as Scene);
    expect(p.items[0]!.before).toBe('—');
  });
  it('estilo de texto: familia, tamaño y peso → estilo', () => {
    const s = scene(text('t', 'x', { fontSize: 16, fontWeight: 700 }), text('m', 'x', { fontSize: 16, fontWeight: 500 }), text('r', 'x', { fontSize: 16 }));
    const fs = runRules(s, cat, settings()).findings;
    const p = buildPreview('apply-text-style', fs, s);
    expect(p.items.map((i) => i.before)).toEqual(['Inter 16 / Bold', 'Inter 16 / Medium', 'Inter 16 / Regular']);
    expect(p.items[0]!.after).toBe('Cuerpo');
    const missing = buildPreview('apply-text-style', fs, { rootIds: [], nodes: {} } as Scene);
    expect(missing.items[0]!.before).toBe('—');
  });
  it('espaciado: valores antes y después', () => {
    const p = buildPreview('snap-spacing', findings, sc);
    expect(p.items[0]).toMatchObject({ before: 'espacio 13 · relleno sup. 10', after: 'espacio 12 · relleno sup. 12' });
  });
  it('solo incluye hallazgos de ese tipo y con corrección', () => {
    expect(buildPreview('rename', [by('spacing-off-scale:f')], sc).items).toEqual([]);
    expect(buildPreview('rename', [{ ...by('layer-default-name:f'), fix: undefined }], sc).items).toEqual([]);
  });
});

function fakePort(nodes: Record<string, Partial<FixNode>>, extra: Partial<FixPort> = {}) {
  const loaded: unknown[] = [];
  const port: FixPort = {
    getNode: async (id) => (nodes[id] as FixNode | undefined) ?? null,
    getTextStyleFont: async (id) => (id === 'S:text0' ? { family: 'Inter', style: 'Regular' } : null),
    getVariable: async (id) => (id.startsWith('VariableID') ? { id } : null),
    loadFont: async (f) => void loaded.push(f),
    bindColor: (p, v) => ({ ...(p as object), bound: v }),
    commitUndo: vi.fn(),
    ...extra,
  };
  return { port, loaded };
}

describe('applyFixes', () => {
  it('renombra y hace un solo commitUndo por lote', async () => {
    const node = { type: 'FRAME', name: 'Frame 1' };
    const { port } = fakePort({ f: node });
    const r = await applyFixes('rename', [by('layer-default-name:f')], port);
    expect(r).toEqual({ kind: 'rename', applied: ['layer-default-name:f'], skipped: [] });
    expect(node.name).toBe('Columna');
    expect(port.commitUndo).toHaveBeenCalledTimes(1);
  });
  it('renombra con el nombre de la IA si existe', async () => {
    const node = { type: 'FRAME', name: 'Frame 1' };
    const { port } = fakePort({ f: node });
    await applyFixes('rename', [by('layer-default-name:f')], port, { 'layer-default-name:f': 'Tarjeta' });
    expect(node.name).toBe('Tarjeta');
  });
  it('aplica estilo de color (estilo) y variable', async () => {
    const styled = { type: 'RECTANGLE', name: 'a', fills: [{ type: 'SOLID' }], setFillStyleIdAsync: vi.fn(async () => {}) };
    const withVar = { type: 'RECTANGLE', name: 'b', fills: [{ type: 'GRADIENT_LINEAR' }, { type: 'SOLID', visible: true }] } as Partial<FixNode>;
    const { port } = fakePort({ near: styled, white: withVar });
    const r = await applyFixes('apply-color', [by('color-near-style:near'), by('fill-no-style:white')], port);
    expect(r.applied).toHaveLength(2);
    expect(styled.setFillStyleIdAsync).toHaveBeenCalledWith('S:color0');
    expect((withVar.fills as unknown[])[1]).toMatchObject({ bound: { id: 'VariableID:color1' } });
    expect((withVar.fills as unknown[])[0]).toEqual({ type: 'GRADIENT_LINEAR' });
  });
  it('color: omite si no se puede (sin relleno, sin función, variable ausente, sin relleno sólido)', async () => {
    const f1 = by('color-near-style:near');
    const f2 = by('fill-no-style:white');
    const { port } = fakePort({
      near: { type: 'RECTANGLE', name: 'a', fills: Symbol('mixed') },
      white: { type: 'RECTANGLE', name: 'b', fills: [{ type: 'GRADIENT_LINEAR' }] },
    });
    expect((await applyFixes('apply-color', [f1, f2], port)).skipped).toHaveLength(2);
    const { port: p2 } = fakePort({ near: { type: 'RECTANGLE', name: 'a', fills: [{ type: 'SOLID' }] } });
    expect((await applyFixes('apply-color', [f1], p2)).skipped).toEqual([f1.id]);
    const gone = { ...f2, fix: { ...f2.fix!, styleId: 'VariableID:nada-no' } } as Finding;
    const { port: p3 } = fakePort({ white: { type: 'RECTANGLE', name: 'b', fills: [{ type: 'SOLID' }] } }, { getVariable: async () => null });
    expect((await applyFixes('apply-color', [gone], p3)).skipped).toEqual([f2.id]);
  });
  it('aplica estilo de texto cargando fuentes primero', async () => {
    const s = scene(text('t', 'Hola', { fontSize: 16 }));
    const f = runRules(s, cat, settings()).findings.find((x) => x.ruleId === 'text-no-style')!;
    const order: string[] = [];
    const node = {
      type: 'TEXT', name: 'Hola', characters: 'Hola',
      getRangeAllFontNames: () => [{ family: 'Inter', style: 'Bold' }],
      setTextStyleIdAsync: vi.fn(async () => void order.push('set')),
    };
    const { port } = fakePort({ t: node }, { loadFont: async () => void order.push('load') });
    const r = await applyFixes('apply-text-style', [f], port);
    expect(r.applied).toEqual([f.id]);
    expect(order).toEqual(['load', 'load', 'set']);
    // Sin getRangeAllFontNames también funciona.
    const n2 = { type: 'TEXT', name: 'x', setTextStyleIdAsync: vi.fn(async () => {}) };
    expect((await applyFixes('apply-text-style', [f], fakePort({ t: n2 }).port)).applied).toHaveLength(1);
  });
  it('estilo de texto: omite si no es texto, no hay función o el estilo no existe', async () => {
    const s = scene(text('t', 'x', { fontSize: 16 }));
    const f = runRules(s, cat, settings()).findings.find((x) => x.ruleId === 'text-no-style')!;
    const set = vi.fn(async () => {});
    expect((await applyFixes('apply-text-style', [f], fakePort({ t: { type: 'FRAME', name: 'x', setTextStyleIdAsync: set } }).port)).skipped).toHaveLength(1);
    expect((await applyFixes('apply-text-style', [f], fakePort({ t: { type: 'TEXT', name: 'x' } }).port)).skipped).toHaveLength(1);
    const noStyle = fakePort({ t: { type: 'TEXT', name: 'x', setTextStyleIdAsync: set } }, { getTextStyleFont: async () => null });
    expect((await applyFixes('apply-text-style', [f], noStyle.port)).skipped).toHaveLength(1);
    expect(set).not.toHaveBeenCalled();
  });
  it('ajusta espaciado y respeta lo que el usuario cambió después', async () => {
    const f = by('spacing-off-scale:f');
    const ok = { type: 'FRAME', name: 'f', layoutMode: 'VERTICAL', itemSpacing: 13, paddingLeft: 16, paddingRight: 16, paddingTop: 10, paddingBottom: 16 };
    expect((await applyFixes('snap-spacing', [f], fakePort({ f: ok }).port)).applied).toEqual([f.id]);
    expect(ok).toMatchObject({ itemSpacing: 12, paddingTop: 12 });
    const changed = { ...ok, itemSpacing: 20 };
    expect((await applyFixes('snap-spacing', [f], fakePort({ f: changed }).port)).skipped).toEqual([f.id]);
    const noLayout = { type: 'FRAME', name: 'f', layoutMode: 'NONE', itemSpacing: 13, paddingTop: 10 };
    expect((await applyFixes('snap-spacing', [f], fakePort({ f: noLayout }).port)).skipped).toEqual([f.id]);
    expect((await applyFixes('snap-spacing', [f], fakePort({ f: { type: 'FRAME', name: 'f' } }).port)).skipped).toEqual([f.id]);
  });
  it('omite capas que ya no existen o fueron eliminadas, y no hace commitUndo si no cambió nada', async () => {
    const f = by('layer-default-name:f');
    const a = fakePort({});
    expect((await applyFixes('rename', [f], a.port)).skipped).toEqual([f.id]);
    expect(a.port.commitUndo).not.toHaveBeenCalled();
    const b = fakePort({ f: { type: 'FRAME', name: 'x', removed: true } });
    expect((await applyFixes('rename', [f], b.port)).skipped).toEqual([f.id]);
  });
  it('un error en una capa no detiene el resto', async () => {
    const f = by('layer-default-name:f');
    const boom = { type: 'FRAME', name: '' } as FixNode;
    Object.defineProperty(boom, 'name', { set() { throw new Error('bloqueada'); }, get: () => 'x' });
    const ok = { type: 'FRAME', name: 'Frame 9' };
    const f2 = { ...f, id: 'layer-default-name:g', nodeId: 'g' };
    const r = await applyFixes('rename', [f, f2], fakePort({ f: boom, g: ok }).port);
    expect(r).toMatchObject({ applied: ['layer-default-name:g'], skipped: ['layer-default-name:f'] });
  });
  it('hallazgos de otro tipo se omiten', async () => {
    const f = by('spacing-off-scale:f');
    expect((await applyFixes('rename', [f], fakePort({ f: { type: 'FRAME', name: 'x' } }).port)).skipped).toEqual([f.id]);
  });
});
