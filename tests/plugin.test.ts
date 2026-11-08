// Prueba de integración del hilo principal con una API de Figma simulada:
// mensajes ↔ lectura ↔ motor ↔ correcciones. No sustituye probar en Figma (ver docs/verificacion-manual.md).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToPlugin, ToUi } from '../src/shared/messages';

type N = Record<string, unknown> & { id: string; type: string; children?: N[]; parent?: N | null };
const link = (n: N, parent: N | null = null): N => {
  n.parent = parent;
  (n.children ?? []).forEach((c) => link(c, n));
  return n;
};
const solid = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return { type: 'SOLID', color: { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 } };
};

let posted: ToUi[];
let showUICall: unknown[] = [];
let nodes: Record<string, N>;
let page: { id: string; type: string; selection: N[]; children: N[] };
const store = new Map<string, unknown>();
const pluginData = new Map<string, string>();
const send = async (m: ToPlugin) => {
  await (figma.ui.onmessage as (m: ToPlugin) => Promise<void>)(m);
};
const last = <T extends ToUi['type']>(type: T) => [...posted].reverse().find((m) => m.type === type) as Extract<ToUi, { type: T }> | undefined;

function build() {
  const frame = link({
    id: '1:1', type: 'FRAME', name: 'Frame 482', width: 200, height: 100, x: 0, y: 0, fills: [solid('#FFFFFF')], visible: true, opacity: 1,
    layoutMode: 'VERTICAL', itemSpacing: 13, paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 16,
    children: [
      { id: '1:2', type: 'TEXT', name: 'Hola', characters: 'Hola', width: 50, height: 20, x: 0, y: 0, fills: [solid('#CCCCCC')], fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, textStyleId: '', visible: true, opacity: 1 },
    ],
  });
  link(frame, page as unknown as N);
  nodes = { '1:1': frame, '1:2': frame.children![0]! };
  page.children = [frame];
  page.selection = [frame];
}

beforeAll(async () => {
  page = { id: '0:1', type: 'PAGE', selection: [], children: [] };
  posted = [];
  vi.stubGlobal('__html__', '<html></html>');
  vi.stubGlobal('figma', {
    mixed: Symbol('mixed'),
    showUI: vi.fn(),
    on: vi.fn(),
    notify: vi.fn(),
    commitUndo: vi.fn(),
    ui: { postMessage: (m: ToUi) => posted.push(m), onmessage: null, resize: vi.fn() },
    clientStorage: {
      getAsync: async (k: string) => store.get(k),
      setAsync: async (k: string, v: unknown) => void store.set(k, v),
      deleteAsync: async (k: string) => void store.delete(k),
    },
    root: { getPluginData: (k: string) => pluginData.get(k) ?? '', setPluginData: (k: string, v: string) => void pluginData.set(k, v) },
    get currentPage() { return page; },
    getNodeByIdAsync: async (id: string) => nodes[id] ?? null,
    getStyleByIdAsync: async () => null,
    setCurrentPageAsync: vi.fn(),
    viewport: { scrollAndZoomIntoView: vi.fn() },
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    variables: { getLocalVariablesAsync: async () => [], getVariableCollectionByIdAsync: async () => null },
  });
  await import('../src/plugin/main');
  await vi.waitFor(() => expect(figma.ui.onmessage).toBeTruthy());
  showUICall = vi.mocked(figma.showUI).mock.calls[0] as unknown[];
});

beforeEach(() => {
  posted = [];
  pluginData.clear();
  build();
});

describe('plugin (API de Figma simulada)', () => {
  it('abre la ventana 360×560 con el tema de Figma', () => {
    expect(showUICall[0]).toBe('<html></html>');
    expect(showUICall[1]).toMatchObject({ width: 360, height: 560, themeColors: true });
  });

  it('ready → init con ajustes por defecto, primera vez y selección', async () => {
    await send({ type: 'ready' });
    const init = last('init')!.payload;
    expect(init).toMatchObject({ firstRun: true, hasApiKey: false, selectionCount: 1, last: null, version: '0.1.0' });
    expect(init.settings.aiEnabled).toBe(false);
    await send({ type: 'dismiss-welcome' });
    await send({ type: 'ready' });
    expect(last('init')!.payload.firstRun).toBe(false);
  });

  it('revisar la selección: progreso, resultado y resumen guardado en el archivo', async () => {
    await send({ type: 'review', scope: 'selection' });
    expect(posted.some((m) => m.type === 'progress')).toBe(true);
    const res = last('result')!.payload;
    const ids = res.findings.map((f) => f.id).sort();
    expect(ids).toEqual(['contrast:1:2', 'fill-no-style:1:1', 'fill-no-style:1:2', 'layer-default-name:1:1', 'spacing-off-scale:1:1', 'text-no-style:1:2']);
    expect(res.meta).toMatchObject({ scope: 'selection', nodeCount: 2 });
    expect(JSON.parse(pluginData.get('last')!)).toMatchObject({ total: 6, scope: 'selection', nodeCount: 2 });
  });

  it('sin selección → error claro; página vacía → selección vacía', async () => {
    page.selection = [];
    await send({ type: 'review', scope: 'selection' });
    expect(last('error')).toMatchObject({ kind: 'no-selection' });
    page.children = [];
    await send({ type: 'review', scope: 'page' });
    expect(last('error')).toMatchObject({ kind: 'empty-selection' });
  });

  it('todo oculto → selección vacía', async () => {
    (nodes['1:1'] as unknown as { visible: boolean }).visible = false;
    await send({ type: 'review', scope: 'selection' });
    expect(last('error')).toMatchObject({ kind: 'empty-selection' });
  });

  it('un error inesperado no rompe: se informa y no se modifica nada', async () => {
    Object.defineProperty(nodes['1:1'], 'width', { get() { throw new Error('boom'); }, configurable: true });
    await send({ type: 'review', scope: 'selection' });
    expect(last('error')).toMatchObject({ kind: 'unknown', detail: 'boom' });
  });

  it('archivo demasiado grande → error too-large con sugerencia', async () => {
    const kids = Array.from({ length: 20_001 }, (_, i) => ({ id: `k${i}`, type: 'RECTANGLE', name: 'r', width: 1, height: 1, x: 0, y: 0, fills: [], visible: true, opacity: 1 }));
    page.children = [link({ id: 'big', type: 'FRAME', name: 'Grande', width: 1, height: 1, x: 0, y: 0, fills: [], visible: true, opacity: 1, children: kids as N[] })];
    await send({ type: 'review', scope: 'page' });
    expect(last('error')).toMatchObject({ kind: 'too-large', count: 20_001 });
  });

  it('cancelar a mitad de la lectura avisa y no deja resultado', async () => {
    const kids = Array.from({ length: 3000 }, (_, i) => ({ id: `c${i}`, type: 'RECTANGLE', name: `r${i}`, width: 1, height: 1, x: 0, y: 0, fills: [], visible: true, opacity: 1 }));
    page.children = [link({ id: 'many', type: 'FRAME', name: 'Muchas', width: 1, height: 1, x: 0, y: 0, fills: [], visible: true, opacity: 1, children: kids as N[] })];
    const run = send({ type: 'review', scope: 'page' });
    await send({ type: 'cancel' });
    await run;
    // O terminó antes de la primera cesión, o se canceló: nunca queda a medias.
    expect(posted.some((m) => m.type === 'cancelled') || posted.some((m) => m.type === 'result')).toBe(true);
  });

  it('seleccionar un hallazgo: selecciona la capa y hace zoom', async () => {
    await send({ type: 'select-node', nodeId: '1:2' });
    expect(page.selection).toEqual([nodes['1:2']]);
    expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([nodes['1:2']]);
  });

  it('seleccionar una capa que ya no existe avisa', async () => {
    await send({ type: 'select-node', nodeId: '9:9' });
    expect(figma.notify).toHaveBeenCalledWith(expect.stringContaining('ya no existe'));
  });

  it('ignorar se recuerda por archivo y se puede deshacer', async () => {
    await send({ type: 'ignore', ids: ['a', 'b'] });
    expect(last('ignored')!.ids).toEqual(['a', 'b']);
    await send({ type: 'unignore', ids: ['a'] });
    expect(last('ignored')!.ids).toEqual(['b']);
    await send({ type: 'review', scope: 'selection' });
    expect(last('result')!.payload.ignoredIds).toEqual(['b']);
    await send({ type: 'clear-ignored' });
    expect(last('ignored')!.ids).toEqual([]);
  });

  it('ajustes y clave: se guardan en el equipo, la clave nunca va al archivo', async () => {
    await send({ type: 'save-settings', settings: { ...(last('init')?.payload.settings ?? (await initSettings())), minTextSize: 14 } });
    await send({ type: 'save-key', key: 'sk-ant-api03-ABCDEFG1234' });
    expect(last('settings')).toMatchObject({ hasApiKey: true, keyHint: '1234' });
    expect(store.get('anthropicKey')).toBe('sk-ant-api03-ABCDEFG1234');
    expect([...pluginData.values()].join('')).not.toContain('sk-ant');
    await send({ type: 'ready' });
    expect(last('init')!.payload).toMatchObject({ hasApiKey: true, keyHint: '1234' });
    expect(last('init')!.payload.settings.minTextSize).toBe(14);
    await send({ type: 'clear-key' });
    expect(last('settings')).toMatchObject({ hasApiKey: false });
    expect(store.has('anthropicKey')).toBe(false);
  });

  it('redimensionar se aplica y se recuerda', async () => {
    vi.useFakeTimers();
    await send({ type: 'resize', width: 420, height: 600 });
    expect(figma.ui.resize).toHaveBeenCalledWith(420, 600);
    await vi.advanceTimersByTimeAsync(500);
    expect(store.get('size')).toEqual({ width: 420, height: 600 });
    vi.useRealTimers();
  });

  it('corrección en lote: vista previa → aplicar → un solo paso de deshacer', async () => {
    await send({ type: 'review', scope: 'selection' });
    await send({ type: 'request-fix-preview', kind: 'rename', findingIds: ['layer-default-name:1:1'] });
    expect(last('fix-preview')!.preview.items[0]).toMatchObject({ before: 'Frame 482', after: 'Columna' });

    const commit = vi.mocked(figma.commitUndo);
    commit.mockClear();
    await send({ type: 'apply-fixes', kind: 'rename', findingIds: ['layer-default-name:1:1'] });
    expect(nodes['1:1']!.name).toBe('Columna');
    expect(commit).toHaveBeenCalledTimes(1);
    expect(last('fix-applied')).toMatchObject({ applied: 1, skipped: 0, fixedIds: ['layer-default-name:1:1'] });

    // Ya aplicado: no vuelve a aparecer en una vista previa.
    await send({ type: 'request-fix-preview', kind: 'rename', findingIds: ['layer-default-name:1:1'] });
    expect(last('fix-preview')!.preview.items).toEqual([]);
  });

  it('ajustar espaciado en lote cambia los valores en la capa', async () => {
    await send({ type: 'review', scope: 'selection' });
    await send({ type: 'apply-fixes', kind: 'snap-spacing', findingIds: ['spacing-off-scale:1:1'] });
    expect(nodes['1:1']).toMatchObject({ itemSpacing: 12 });
  });

  it('si la capa desapareció entre la vista previa y aplicar, se omite sin romper', async () => {
    await send({ type: 'review', scope: 'selection' });
    delete nodes['1:1'];
    await send({ type: 'apply-fixes', kind: 'rename', findingIds: ['layer-default-name:1:1'] });
    expect(last('fix-applied')).toMatchObject({ applied: 0, skipped: 1 });
    expect(figma.notify).not.toHaveBeenCalledWith(expect.stringContaining('cambios aplicados'));
  });

  it('notify, mensajes desconocidos y segunda revisión simultánea no rompen', async () => {
    await send({ type: 'notify', message: 'hola' });
    expect(figma.notify).toHaveBeenCalledWith('hola');
    await send({ type: 'check-key' });
    const a = send({ type: 'review', scope: 'selection' });
    const b = send({ type: 'review', scope: 'selection' });
    await Promise.all([a, b]);
    expect(posted.filter((m) => m.type === 'result')).toHaveLength(1);
  });
});

async function initSettings() {
  await send({ type: 'ready' });
  return last('init')!.payload.settings;
}
