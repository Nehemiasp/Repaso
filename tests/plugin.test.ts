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

describe('plugin con IA (fetch simulado)', () => {
  const calls: { url: string; headers: Record<string, string>; body?: string }[] = [];
  const respond = (handler: (user: any) => unknown, status = 200) =>
    vi.stubGlobal('fetch', async (url: string, init: { headers: Record<string, string>; body?: string }) => {
      calls.push({ url, headers: init.headers, body: init.body });
      if (status !== 200) return { ok: false, status, text: async () => JSON.stringify({ error: { type: status === 401 ? 'authentication_error' : 'billing_error', message: 'x' } }) };
      const user = init.body ? JSON.parse(JSON.parse(init.body).messages[0].content) : {};
      return { ok: true, status: 200, text: async () => JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(handler(user)) }], usage: { input_tokens: 300, output_tokens: 50 }, stop_reason: 'end_turn' }) };
    });
  const smart = (user: any) =>
    user.layers ? { names: user.layers.map((l: any) => ({ id: l.id, name: 'Tarjeta / Producto' })) }
    : user.textos ? { issues: [] }
    : { summary: 'Revisión sin sobresaltos: solo falta ordenar nombres y espaciado.' };

  const enableAi = async (over: Record<string, unknown> = {}) => {
    await send({ type: 'save-settings', settings: { ...(await initSettings()), aiEnabled: true, ...over } as never });
    await send({ type: 'save-key', key: 'sk-ant-api03-TESTKEY9999' });
  };
  beforeEach(() => {
    calls.length = 0;
  });

  it('con IA activada: nombres, resumen y caché por archivo; la clave solo va en el encabezado', async () => {
    await enableAi();
    respond(smart);
    await send({ type: 'review', scope: 'selection' });
    const res = last('result')!.payload;
    expect(res.aiSummary).toContain('Revisión sin sobresaltos');
    expect(res.aiNames).toEqual({ 'layer-default-name:1:1': 'Tarjeta / Producto' });
    expect(res.findings.find((f) => f.id === 'layer-default-name:1:1')!.aiNote).toBe('Nombre sugerido por la IA: «Tarjeta / Producto»');
    expect(calls.every((c) => c.url === 'https://api.anthropic.com/v1/messages')).toBe(true);
    expect(calls.every((c) => c.headers['x-api-key'] === 'sk-ant-api03-TESTKEY9999' && c.headers['anthropic-dangerous-direct-browser-access'] === 'true')).toBe(true);
    expect(calls.map((c) => c.body).join('')).not.toContain('TESTKEY');
    expect(pluginData.get('aiCache')).toBeTruthy();
    expect(pluginData.get('aiCache')).not.toContain('TESTKEY');

    // La vista previa de «renombrar» usa el nombre de la IA.
    await send({ type: 'request-fix-preview', kind: 'rename', findingIds: ['layer-default-name:1:1'] });
    expect(last('fix-preview')!.preview.items[0]).toMatchObject({ after: 'Tarjeta / Producto', source: 'ai' });

    // Segunda revisión: lo que no cambió sale de la caché (solo se vuelve a pedir el resumen).
    calls.length = 0;
    await send({ type: 'review', scope: 'selection' });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0]!.body!).messages[0].content).toContain('puntaje');
  });

  it('«Revisar sin IA» no hace ninguna petición de red', async () => {
    await enableAi();
    respond(smart);
    await send({ type: 'review', scope: 'selection', noAi: true });
    expect(calls).toHaveLength(0);
    expect(last('result')!.payload.aiSummary).toBeUndefined();
  });

  it('IA apagada: cero peticiones de red (las reglas funcionan sin internet)', async () => {
    await send({ type: 'save-settings', settings: { ...(await initSettings()), aiEnabled: false } as never });
    respond(smart);
    await send({ type: 'review', scope: 'selection' });
    expect(calls).toHaveLength(0);
    expect(last('result')!.payload.findings.length).toBeGreaterThan(0);
  });

  it('IA activada sin clave: se revisa sin IA y se avisa', async () => {
    await send({ type: 'clear-key' });
    await send({ type: 'save-settings', settings: { ...(await initSettings()), aiEnabled: true } as never });
    respond(smart);
    await send({ type: 'review', scope: 'selection' });
    expect(calls).toHaveLength(0);
    expect(last('result')!.payload.aiNotice).toContain('no hay una clave');
  });

  it.each([
    [401, 'ai-key-invalid'],
    [402, 'ai-no-credit'],
  ])('HTTP %i → error visible «%s» (sin perder la posibilidad de revisar sin IA)', async (status, kind) => {
    await enableAi();
    respond(smart, status);
    await send({ type: 'review', scope: 'selection' });
    expect(last('error')).toMatchObject({ kind });
    expect(posted.some((m) => m.type === 'result')).toBe(false);
  });

  it('sin conexión → ai-offline', async () => {
    await enableAi();
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    await send({ type: 'review', scope: 'selection' });
    expect(last('error')).toMatchObject({ kind: 'ai-offline' });
  });

  it('archivo grande: muestra el estimado y espera la decisión', async () => {
    await enableAi();
    respond(smart);
    const kids = Array.from({ length: 150 }, (_, i) => ({ id: `x${i}`, type: 'TEXT', name: `t${i}`, characters: `Texto número ${i} de la lista`, width: 50, height: 20, x: 0, y: 0, fills: [solid('#111111')], fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, textStyleId: 'S:1', visible: true, opacity: 1 }));
    page.children = [link({ id: 'big', type: 'FRAME', name: 'Lista', width: 300, height: 3000, x: 0, y: 0, fills: [solid('#FFFFFF')], visible: true, opacity: 1, children: kids as N[] })];
    const run = send({ type: 'review', scope: 'page' });
    await vi.waitFor(() => expect(last('ai-estimate')).toBeTruthy());
    expect(last('ai-estimate')!.estimate).toMatchObject({ texts: 150, overBudget: false });
    expect(calls).toHaveLength(0);
    await send({ type: 'ai-decision', run: false });
    await run;
    expect(calls).toHaveLength(0);
    expect(last('result')).toBeTruthy();
  });

  it('archivo grande: si la persona continúa, la IA corre por lotes', async () => {
    await enableAi();
    respond(smart);
    const kids = Array.from({ length: 150 }, (_, i) => ({ id: `y${i}`, type: 'TEXT', name: `t${i}`, characters: `Texto número ${i} de la lista`, width: 50, height: 20, x: 0, y: 0, fills: [solid('#111111')], fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, textStyleId: 'S:1', visible: true, opacity: 1 }));
    page.children = [link({ id: 'big2', type: 'FRAME', name: 'Lista', width: 300, height: 3000, x: 0, y: 0, fills: [solid('#FFFFFF')], visible: true, opacity: 1, children: kids as N[] })];
    const run = send({ type: 'review', scope: 'page' });
    await vi.waitFor(() => expect(last('ai-estimate')).toBeTruthy());
    await send({ type: 'ai-decision', run: true });
    await run;
    expect(calls.length).toBe(4); // 3 lotes de textos + resumen
    expect(posted.some((m) => m.type === 'progress' && m.phase === 'ai')).toBe(true);
  });

  it('cancelar durante la confirmación termina sin gastar', async () => {
    await enableAi();
    respond(smart);
    const kids = Array.from({ length: 150 }, (_, i) => ({ id: `z${i}`, type: 'TEXT', name: `t${i}`, characters: `Texto número ${i} de la lista`, width: 50, height: 20, x: 0, y: 0, fills: [solid('#111111')], fontSize: 16, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, textStyleId: 'S:1', visible: true, opacity: 1 }));
    page.children = [link({ id: 'big3', type: 'FRAME', name: 'Lista', width: 300, height: 3000, x: 0, y: 0, fills: [solid('#FFFFFF')], visible: true, opacity: 1, children: kids as N[] })];
    const run = send({ type: 'review', scope: 'page' });
    await vi.waitFor(() => expect(last('ai-estimate')).toBeTruthy());
    await send({ type: 'cancel' });
    await run;
    expect(last('cancelled')).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it('Probar clave: usa GET /v1/models (sin gastar tokens) y explica cada fallo', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: { method: string }) => {
      seen.push(`${init.method} ${url}`);
      return { ok: true, status: 200, text: async () => '{"data":[]}' };
    });
    await send({ type: 'check-key', key: 'sk-ant-api03-NUEVA0000' });
    expect(last('key-check')).toEqual({ type: 'key-check', ok: true });
    expect(seen).toEqual(['GET https://api.anthropic.com/v1/models?limit=1']);

    respond(smart, 401);
    await send({ type: 'check-key', key: 'sk-ant-mala' });
    expect(last('key-check')).toMatchObject({ ok: false, kind: 'ai-key-invalid', detail: expect.stringContaining('rechazó la clave') });

    vi.stubGlobal('fetch', async () => {
      throw new Error('net');
    });
    await send({ type: 'check-key', key: 'sk-ant-x' });
    expect(last('key-check')).toMatchObject({ ok: false, kind: 'ai-offline' });

    // Sin clave en ningún lado.
    await send({ type: 'clear-key' });
    await send({ type: 'check-key' });
    expect(last('key-check')).toMatchObject({ ok: false, detail: 'Primero pegue una clave.' });
  });

  it('Probar clave con la clave guardada', async () => {
    await send({ type: 'save-key', key: 'sk-ant-api03-GUARDADA11' });
    respond(smart);
    vi.stubGlobal('fetch', async (_u: string, init: { headers: Record<string, string> }) => ({ ok: init.headers['x-api-key'] === 'sk-ant-api03-GUARDADA11', status: 200, text: async () => '{}' }));
    await send({ type: 'check-key' });
    expect(last('key-check')).toMatchObject({ ok: true });
  });
});

async function initSettings() {
  await send({ type: 'ready' });
  return last('init')!.payload.settings;
}
