import { describe, expect, it, vi } from 'vitest';
import { runRules } from '../engine';
import { box, catalog, frame, node, rect, scene, settings, solid, text } from '../../tests/builders';

import { Budget } from './budget';
import { AiCache, hash } from './cache';
import { AiError, API_URL, checkKey, createClient, MODELS_URL, toAiError, type AiClient, type CompleteRequest, type FetchLike } from './client';
import { collectCopyJobs } from './copy';
import { describeLayer, describeVariant, isButtonLabel } from './describe';
import { estimateAi, needsConfirmation } from './estimate';
import { costOf, estimateTokens, formatUsd, priceOf } from './pricing';
import { runAiPass } from './run';
import { BudgetExceeded, structuredCall } from './structured';
import { validateCopy, validateNames, validateStates, validateSummary, ValidationError } from './validate';

// ─────────────────────────── cliente HTTP ───────────────────────────
const okFetch = (body: unknown, status = 200): FetchLike => async () => ({ ok: status < 400, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

describe('cliente de la API', () => {
  it('manda la petición correcta: sin temperature ni tool_choice, con salida estructurada y encabezado CORS', async () => {
    const spy = vi.fn(okFetch({ content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"a":1}' }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: 'end_turn' }));
    const client = createClient({ apiKey: 'sk-ant-test', model: 'claude-haiku-5-5', fetchFn: spy });
    const res = await client.complete({ system: 'S', user: 'U', schema: { type: 'object' }, maxTokens: 100 });
    expect(res).toEqual({ text: '{"a":1}', usage: { input_tokens: 10, output_tokens: 5 }, stopReason: 'end_turn' });
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe(API_URL);
    expect(init.headers).toMatchObject({ 'x-api-key': 'sk-ant-test', 'anthropic-version': '2026-10-21', 'anthropic-dangerous-direct-browser-access': 'true' });
    const body = JSON.parse(init.body!);
    expect(body).toMatchObject({ model: 'claude-haiku-5-5', max_tokens: 100, system: 'S', messages: [{ role: 'user', content: 'U' }], output_config: { effort: 'low', format: { type: 'json_schema', schema: { type: 'object' } } } });
    for (const prohibido of ['temperature', 'top_p', 'top_k', 'tool_choice', 'thinking']) expect(body).not.toHaveProperty(prohibido);
  });
  it('la clave solo viaja en el encabezado, nunca en el cuerpo ni en la URL', async () => {
    const spy = vi.fn(okFetch({ content: [], usage: {} }));
    await createClient({ apiKey: 'sk-ant-SECRETA', model: 'm', fetchFn: spy }).complete({ system: '', user: '', schema: {}, maxTokens: 1 });
    expect(spy.mock.calls[0]![0]).not.toContain('SECRETA');
    expect(spy.mock.calls[0]![1].body).not.toContain('SECRETA');
  });
  it('tolera respuesta sin uso ni stop_reason', async () => {
    const r = await createClient({ apiKey: 'k', model: 'm', fetchFn: okFetch({}) }).complete({ system: '', user: '', schema: {}, maxTokens: 1 });
    expect(r).toEqual({ text: '', usage: { input_tokens: 0, output_tokens: 0 }, stopReason: null });
    const r2 = await createClient({ apiKey: 'k', model: 'm', fetchFn: okFetch({ content: [{ type: 'text' }] }) }).complete({ system: '', user: '', schema: {}, maxTokens: 1 });
    expect(r2.text).toBe('');
  });
  it('sin conexión → ai-offline', async () => {
    const c = createClient({ apiKey: 'k', model: 'm', fetchFn: async () => { throw new TypeError('Failed to fetch'); } });
    await expect(c.complete({ system: '', user: '', schema: {}, maxTokens: 1 })).rejects.toMatchObject({ kind: 'ai-offline', transient: true, detail: 'Failed to fetch' });
    const c2 = createClient({ apiKey: 'k', model: 'm', fetchFn: async () => { throw 'raro'; } });
    await expect(c2.complete({ system: '', user: '', schema: {}, maxTokens: 1 })).rejects.toMatchObject({ kind: 'ai-offline', detail: 'raro' });
  });
  it('respuesta que no es JSON', async () => {
    const c = createClient({ apiKey: 'k', model: 'm', fetchFn: okFetch('<html>') });
    await expect(c.complete({ system: '', user: '', schema: {}, maxTokens: 1 })).rejects.toMatchObject({ kind: 'unknown', transient: true });
  });
  it.each([
    [401, 'authentication_error', 'invalid x-api-key', 'ai-key-invalid'],
    [403, 'permission_error', 'no', 'ai-key-invalid'],
    [402, 'billing_error', 'pay', 'ai-no-credit'],
    [400, 'invalid_request_error', 'Your credit balance is too low to access the API', 'ai-no-credit'],
    [429, 'rate_limit_error', 'slow down', 'ai-rate-limit'],
    [500, 'api_error', 'oops', 'unknown'],
    [529, 'overloaded_error', 'busy', 'unknown'],
    [400, 'invalid_request_error', 'mal formado', 'unknown'],
  ])('HTTP %i %s → %s', (status, type, message, kind) => {
    const e = toAiError(status, JSON.stringify({ error: { type, message } }));
    expect(e.kind).toBe(kind);
    expect(e.detail).toContain(`HTTP ${status}`);
    expect(e.transient).toBe(status >= 500);
  });
  it('CORS bloqueado por la organización se explica', () => {
    const e = toAiError(401, JSON.stringify({ error: { type: 'authentication_error', message: 'CORS requests are not allowed for this Organization because of its settings' } }));
    expect(e).toMatchObject({ kind: 'unknown' });
    expect(e.detail).toContain('no permite llamadas desde el navegador');
  });
  it('cuerpo de error que no es JSON', () => {
    expect(toAiError(502, '<html>Bad gateway</html>').detail).toContain('Bad gateway');
    expect(toAiError(400, '{}').detail).toBe('HTTP 400');
  });
  it('checkKey: ok, clave mala y sin conexión; no gasta tokens (GET /v1/models)', async () => {
    const spy = vi.fn(okFetch({ data: [] }));
    await checkKey('sk-ant-x', spy);
    expect(spy.mock.calls[0]![0]).toBe(MODELS_URL);
    expect(spy.mock.calls[0]![1].method).toBe('GET');
    await expect(checkKey('k', okFetch({ error: { type: 'authentication_error', message: 'bad' } }, 401))).rejects.toMatchObject({ kind: 'ai-key-invalid' });
    await expect(checkKey('k', async () => { throw new Error('net'); })).rejects.toMatchObject({ kind: 'ai-offline' });
  });
});

// ─────────────────────────── precios y tope ───────────────────────────
describe('precios y presupuesto', () => {
  it('costo por modelo; modelo desconocido se estima con el más caro', () => {
    expect(costOf('claude-haiku-5-5', 1_000_000, 1_000_000)).toBeCloseTo(0.6, 6);
    expect(costOf('claude-sonnet-5-5', 1_000_000, 0)).toBe(2);
    expect(priceOf('modelo-nuevo')).toEqual(priceOf('claude-opus-5-5'));
  });
  it('estima tokens y formatea USD con coma', () => {
    expect(estimateTokens('a'.repeat(350))).toBe(120);
    expect(formatUsd(0.004)).toBe('< 0,01 USD');
    expect(formatUsd(0.256)).toBe('0,26 USD');
  });
  it('Budget acumula uso real y decide si cabe otra llamada', () => {
    const b = new Budget(0.001, 'claude-haiku-5-5');
    expect(b.canAfford(1000, 1000)).toBe(true);
    b.add({ input_tokens: 5000, output_tokens: 1000 });
    expect(b).toMatchObject({ calls: 1, inputTokens: 5000, outputTokens: 1000 });
    expect(b.spent).toBeCloseTo(0.001, 6);
    expect(b.canAfford(10, 10)).toBe(false);
  });
});

// ─────────────────────────── validación ───────────────────────────
describe('validación de respuestas', () => {
  const ids = new Set(['L1', 'L2', 'L3']);
  it('nombres: acepta los buenos y descarta los malos uno por uno', () => {
    const out = validateNames(
      { names: [
        { id: 'L1', name: 'Tarjeta/Producto' },
        { id: 'L2', name: 'Frame 482' },
        { id: 'L3', name: 'x'.repeat(61) },
        { id: 'L9', name: 'Fantasma' },
        { id: 'L1', name: '' },
        { id: 'L2', name: 'Fila / A / B / C / D' },
        { id: 'L2', name: 'Fila //  Columna' },
        { id: 'L2', name: 'Sección 2024' },
        { id: 7, name: 'x' },
        { id: 'L3', name: 'Ícono / Cerrar' },
      ] },
      ids,
    );
    expect(out).toEqual([{ id: 'L1', name: 'Tarjeta / Producto' }, { id: 'L3', name: 'Ícono / Cerrar' }]);
  });
  it('lista ausente o mal formada → ValidationError', () => {
    expect(() => validateNames({}, ids)).toThrow(ValidationError);
    expect(() => validateNames(null, ids)).toThrow('Falta la lista');
    expect(() => validateStates({ sets: 'no' }, ids)).toThrow(ValidationError);
    expect(() => validateCopy([], new Map())).toThrow(ValidationError);
  });
  it('estados', () => {
    const out = validateStates(
      { sets: [
        { id: 'L1', missing: [{ state: 'hover', description: 'Fondo 10 % más oscuro.' }, { state: '', description: 'x' }, { state: 'foco', description: 'y'.repeat(401) }, 'basura'] },
        { id: 'L2', missing: [] },
        { id: 'L9', missing: [{ state: 'a', description: 'b' }] },
        { id: 'L3', missing: 'no' },
        { id: 7 },
      ] },
      ids,
    );
    expect(out).toEqual([{ id: 'L1', notes: [{ state: 'hover', description: 'Fondo 10 % más oscuro.' }] }]);
  });
  it('textos: descarta no-ops, desproporcionados, tipos raros y «case» que cambia más que mayúsculas', () => {
    const texts = new Map([['T1', 'Contraseña inválda'], ['T2', 'CANCELAR'], ['T3', 'Hola'], ['T4', 'Guardar']]);
    const out = validateCopy(
      { issues: [
        { id: 'T1', kind: 'spelling', suggested: 'Contraseña inválida', reason: 'Falta una «i».' },
        { id: 'T2', kind: 'case', suggested: 'Cancelar', reason: '' },
        { id: 'T3', kind: 'spelling', suggested: 'Hola' },
        { id: 'T3', kind: 'spelling', suggested: 'x'.repeat(200), reason: 'reescribió' },
        { id: 'T3', kind: 'otro', suggested: 'Hola!' },
        { id: 'T4', kind: 'case', suggested: 'Almacenar', reason: 'no es solo mayúsculas' },
        { id: 'T9', kind: 'spelling', suggested: 'a' },
        { id: 'T3', kind: 'tone', suggested: '' },
        { id: 'T4', kind: 'tone', suggested: 'Guárdelo', reason: 'r'.repeat(500) },
      ] },
      texts,
    );
    expect(out.map((i) => [i.id, i.kind])).toEqual([['T1', 'spelling'], ['T2', 'case'], ['T4', 'tone']]);
    expect(out[2]!.reason).toHaveLength(200);
  });
  it('resumen: largo razonable', () => {
    expect(validateSummary({ summary: '  El archivo   va bien, con detalles por corregir.  ' })).toBe('El archivo va bien, con detalles por corregir.');
    expect(() => validateSummary({ summary: 'corto' })).toThrow(ValidationError);
    expect(() => validateSummary({ summary: 'x'.repeat(701) })).toThrow(ValidationError);
    expect(() => validateSummary(null)).toThrow(ValidationError);
  });
});

// ─────────────────────────── structuredCall ───────────────────────────
const req = (): CompleteRequest => ({ system: 'S', user: 'U', schema: {}, maxTokens: 100 });
const fake = (...replies: (string | Error | { text: string; stopReason?: string })[]) => {
  let i = 0;
  const complete = vi.fn(async () => {
    const r = replies[Math.min(i++, replies.length - 1)]!;
    if (r instanceof Error) throw r;
    const o = typeof r === 'string' ? { text: r } : r;
    return { text: o.text, stopReason: o.stopReason ?? 'end_turn', usage: { input_tokens: 100, output_tokens: 20 } };
  });
  return { client: { complete } as AiClient, complete };
};
const bud = () => new Budget(10, 'claude-haiku-5-5');
const val = (raw: unknown) => {
  if (!raw || typeof raw !== 'object' || !('ok' in raw)) throw new ValidationError('mal');
  return 'ok';
};

describe('structuredCall', () => {
  it('devuelve lo validado y anota el gasto real', async () => {
    const { client } = fake('{"ok":1}');
    const b = bud();
    expect(await structuredCall({ client, budget: b, request: req(), validate: val })).toBe('ok');
    expect(b.calls).toBe(1);
  });
  it('reintenta UNA vez si la respuesta no es válida, y si falla otra vez la descarta (null)', async () => {
    const a = fake('no es json', '{"ok":1}');
    expect(await structuredCall({ client: a.client, budget: bud(), request: req(), validate: val })).toBe('ok');
    expect(a.complete).toHaveBeenCalledTimes(2);
    const b = fake('{"x":1}');
    expect(await structuredCall({ client: b.client, budget: bud(), request: req(), validate: val })).toBeNull();
    expect(b.complete).toHaveBeenCalledTimes(2);
  });
  it('un refusal o un corte por tokens cuentan como respuesta inválida', async () => {
    const a = fake({ text: '{"ok":1}', stopReason: 'refusal' }, { text: '{"ok":1}', stopReason: 'max_tokens' });
    expect(await structuredCall({ client: a.client, budget: bud(), request: req(), validate: val })).toBeNull();
  });
  it('un 5xx pasajero se reintenta una vez; los demás errores se propagan', async () => {
    const transient = new AiError('unknown', 'HTTP 500', true);
    const a = fake(transient, '{"ok":1}');
    expect(await structuredCall({ client: a.client, budget: bud(), request: req(), validate: val })).toBe('ok');
    const b = fake(transient);
    expect(await structuredCall({ client: b.client, budget: bud(), request: req(), validate: val })).toBeNull();
    for (const err of [new AiError('ai-key-invalid', 'x'), new AiError('ai-no-credit', 'x'), new AiError('ai-rate-limit', 'x'), new AiError('ai-offline', 'x', true), new Error('raro')]) {
      await expect(structuredCall({ client: fake(err).client, budget: bud(), request: req(), validate: val })).rejects.toBe(err);
    }
  });
  it('no llama si no cabe en el tope', async () => {
    const { client, complete } = fake('{"ok":1}');
    await expect(structuredCall({ client, budget: new Budget(0, 'claude-haiku-5-5'), request: req(), validate: val })).rejects.toBeInstanceOf(BudgetExceeded);
    expect(complete).not.toHaveBeenCalled();
    expect(new BudgetExceeded().message).toContain('tope');
  });
});

// ─────────────────────────── caché ───────────────────────────
describe('caché por archivo', () => {
  it('hash estable y distinto', () => {
    expect(hash('hola')).toBe(hash('hola'));
    expect(hash('hola')).not.toBe(hash('hola '));
    expect(hash('')).toBeTruthy();
  });
  it('guarda, lee y serializa; ignora basura', () => {
    const c = new AiCache();
    c.set('name', 'k1', 'Fila');
    expect(c.get('name', 'k1')).toBe('Fila');
    expect(c.get('name', 'nada')).toBeUndefined();
    expect(AiCache.parse(c.serialize()).get('name', 'k1')).toBe('Fila');
    expect(AiCache.parse('basura').size).toBe(0);
    expect(AiCache.parse('{"v":2}').size).toBe(0);
    expect(AiCache.parse('{"v":1,"e":[["a:b","c"],[1,2],["x"]]}').size).toBe(1);
  });
  it('si no cabe, descarta lo más antiguo y conserva lo usado hace poco', () => {
    const c = new AiCache();
    for (let i = 0; i < 200; i++) c.set('n', `k${i}`, 'valor-largo-'.repeat(5));
    c.get('n', 'k0'); // lo usa: pasa a ser el más reciente
    const out = c.serialize(2000);
    expect(out.length).toBeLessThanOrEqual(2000);
    const back = AiCache.parse(out);
    expect(back.get('n', 'k0')).toBeDefined();
    expect(back.get('n', 'k1')).toBeUndefined();
    expect(AiCache.parse(c.serialize(10)).size).toBe(0);
  });
});

// ─────────────────────────── describir capas ───────────────────────────
describe('descripciones (solo estructura, nunca imágenes)', () => {
  const s = scene(
    frame('p', { name: 'Pantalla', box: box(400, 400), layout: { mode: 'VERTICAL', gap: 8, padL: 0, padR: 0, padT: 0, padB: 0 } }, [
      frame('f', { name: 'Frame 9', box: box(200, 100, 100, 200), layout: { mode: 'HORIZONTAL', gap: 4, padL: 0, padR: 0, padT: 0, padB: 0 } }, [
        text('t', 'Precio: 29 USD'), rect('r', { name: 'Rectangle 2' }), rect('r2', { name: 'Fondo de oferta' }), rect('oculto', { visible: false }),
      ]),
    ]),
  );
  it('describe tipo, tamaño, layout, posición relativa, padre e hijos', () => {
    expect(describeLayer(s.nodes.f!, s)).toEqual({
      type: 'FRAME', name: 'Frame 9', size: '200×100', layout: 'fila', position: '25%, 50%', parent: 'FRAME «Pantalla»',
      children: ['TEXT «Precio: 29 USD»', 'RECTANGLE', 'RECTANGLE «Fondo de oferta»'],
    });
    expect(describeLayer(s.nodes.p!, s)).toMatchObject({ layout: 'columna', children: ['FRAME'] });
    const lonely = scene(node('x', 'GROUP', { box: box(0, 0) }));
    expect(describeLayer(lonely.nodes.x!, lonely)).toEqual({ type: 'GROUP', name: 'x', size: '0×0', children: [] });
    const orphan = scene(node('y', 'GROUP', { parentId: 'nada' } as never));
    expect(describeLayer({ ...orphan.nodes.y!, parentId: 'nada' }, orphan).parent).toBeUndefined();
  });
  it('no filtra colores ni imágenes de capas, solo de variantes de componente', () => {
    const json = JSON.stringify(describeLayer(s.nodes.f!, s));
    expect(json).not.toMatch(/#[0-9A-F]{6}/i);
    const v = scene(frame('v', { name: 'Estado=Normal', fills: [solid('#043565')], radius: 8, hasStroke: true }, [text('vt', 'Ok', { fills: [solid('#FFFFFF')] })]));
    expect(describeVariant(v.nodes.v!, v)).toEqual({ variante: 'Estado=Normal', fondo: '#043565', colorTexto: '#FFFFFF', trazo: 'sí', radio: 8, opacidad: 1 });
    const bare = scene(frame('b', {}));
    expect(describeVariant(bare.nodes.b!, bare)).toEqual({ variante: 'b', fondo: 'sin relleno', trazo: 'no', opacidad: 1 });
  });
  it('reconoce etiquetas de botón subiendo hasta 3 niveles', () => {
    const b = scene(frame('btn', { name: 'Botón / Relleno' }, [frame('in', {}, [text('lab', 'Enviar')])]), frame('card', { name: 'Tarjeta' }, [text('x', 'Texto')]), node('i', 'INSTANCE', { name: 'Elemento', component: { kind: 'instance', mainName: 'Button' } }, [text('il', 'Ir')]));
    expect(isButtonLabel(b.nodes.lab!, b)).toBe(true);
    expect(isButtonLabel(b.nodes.x!, b)).toBe(false);
    expect(isButtonLabel(b.nodes.il!, b)).toBe(true);
    expect(isButtonLabel(b.nodes.btn!, b)).toBe(false);
  });
});

// ─────────────────────────── pasada completa con IA simulada ───────────────────────────
function demo() {
  const btn = (id: string, label: string) => frame(id, { name: `Botón / ${id}`, fills: [solid('#043565', 1, { styleId: 'S:1' })] }, [text(`${id}-t`, label, { fills: [solid('#FFFFFF', 1, { styleId: 'S:1' })], textStyleId: 'S:2' })]);
  const sc = scene(
    frame('root', { name: 'Pantalla', fills: [solid('#FFFFFF', 1, { styleId: 'S:1' })], box: box(400, 800) }, [
      frame('f1', { name: 'Frame 482', box: box(100, 40) }, [text('t1', 'Precio', { fills: [solid('#111111', 1, { styleId: 'S:1' })], textStyleId: 'S:2' })]),
      text('t2', 'Contraseña inválda', { fills: [solid('#111111', 1, { styleId: 'S:1' })], textStyleId: 'S:2' }),
      text('t3', 'Contraseña inválda', { fills: [solid('#111111', 1, { styleId: 'S:1' })], textStyleId: 'S:2' }),
      text('t4', '12345', { fills: [solid('#111111', 1, { styleId: 'S:1' })], textStyleId: 'S:2' }),
      btn('b1', 'Guardar'), btn('b2', 'CANCELAR'),
      node('set', 'COMPONENT_SET', { name: 'Botón', component: { kind: 'set', variantOptions: { Estado: ['Normal', 'Hover'] } } }, [
        node('v1', 'COMPONENT', { name: 'Estado=Normal', fills: [solid('#043565', 1, { styleId: 'S:1' })] }),
      ]),
    ]),
  );
  const findings = runRules(sc, catalog(), settings()).findings;
  return { sc, findings };
}

/** IA simulada: responde según el tipo de petición. */
function smartAi(over: { names?: unknown; states?: unknown; copy?: unknown; summary?: unknown } = {}) {
  const calls: { kind: string; user: any }[] = [];
  const client: AiClient = {
    complete: async (r) => {
      const user = JSON.parse(r.user);
      const kind = user.layers ? 'names' : user.sets ? 'states' : user.textos ? 'copy' : 'summary';
      calls.push({ kind, user });
      const data = {
        names: over.names ?? { names: (user.layers ?? []).map((l: any) => ({ id: l.id, name: 'Contenedor / Precio' })) },
        states: over.states ?? { sets: (user.sets ?? []).map((s: any) => ({ id: s.id, missing: s.faltan.map((m: string) => ({ state: m, description: `Como Normal, con ${m}.` })) })) },
        copy: over.copy ?? {
          issues: (user.textos ?? []).flatMap((t: any) =>
            t.texto === 'Contraseña inválda' ? [{ id: t.id, kind: 'spelling', suggested: 'Contraseña inválida', reason: 'Falta una i.' }]
            : t.texto === 'CANCELAR' ? [{ id: t.id, kind: 'case', suggested: 'Cancelar', reason: 'Los demás botones usan mayúscula inicial.' }] : []),
        },
        summary: over.summary ?? { summary: 'El archivo está en buen camino: corrija primero la ortografía y los nombres.' },
      }[kind];
      return { text: JSON.stringify(data), stopReason: 'end_turn', usage: { input_tokens: 500, output_tokens: 100 } };
    },
  };
  return { client, calls };
}

describe('pasada con IA', () => {
  const run = (client: AiClient, extra: Partial<Parameters<typeof runAiPass>[0]> = {}) => {
    const { sc, findings } = demo();
    return runAiPass({ scene: sc, findings, ignored: new Set(), settings: settings({ aiEnabled: true }), client, cache: new AiCache(), signal: { cancelled: false }, ...extra });
  };

  it('propone nombres, describe estados, detecta textos y resume; envía solo texto y estructura', async () => {
    const { client, calls } = smartAi();
    const progress: [number, number][] = [];
    const out = await run(client, { onProgress: (d, t) => progress.push([d, t]) });
    expect(out.aiNames).toEqual({ 'layer-default-name:f1': 'Contenedor / Precio' });
    expect(out.notes['component-missing-states:set']).toBe('foco: Como Normal, con foco.\ndeshabilitado: Como Normal, con deshabilitado.');
    expect(out.extra.map((f) => f.id).sort()).toEqual(['ai-case:b2-t', 'ai-spelling:t2', 'ai-spelling:t3']);
    expect(out.extra.find((f) => f.id === 'ai-case:b2-t')).toMatchObject({ category: 'texts', severity: 'low', nodeType: 'TEXT', message: 'Mayúsculas: «CANCELAR» → «Cancelar»', detail: 'Los demás botones usan mayúscula inicial.' });
    expect(out.extra.find((f) => f.id === 'ai-spelling:t2')).toMatchObject({ severity: 'medium', message: 'Ortografía: «Contraseña inválda» → «Contraseña inválida»' });
    expect(out.summary).toContain('buen camino');
    expect(out.notice).toBeUndefined();
    expect(out.calls).toBe(4);
    expect(out.spentUsd).toBeGreaterThan(0);
    expect(progress[0]).toEqual([0, 4]);
    expect(progress[progress.length - 1]).toEqual([4, 4]);
    // El texto repetido se manda una sola vez.
    const copyCall = calls.find((c) => c.kind === 'copy')!;
    expect(copyCall.user.textos.filter((t: any) => t.texto === 'Contraseña inválda')).toHaveLength(1);
    // Los números no se mandan, los botones van primero y marcados.
    expect(copyCall.user.textos.some((t: any) => t.texto === '12345')).toBe(false);
    expect(copyCall.user.textos[0].isButton).toBe(true);
    // Privacidad: ni colores ni imágenes en lo que se envía para nombres y textos.
    const sent = JSON.stringify(calls.filter((c) => c.kind === 'names' || c.kind === 'copy'));
    expect(sent).not.toMatch(/#[0-9A-Fa-f]{6}|base64|image/);
  });

  it('no inventa hallazgos de las reglas: la lista de reglas queda intacta', async () => {
    const { sc, findings } = demo();
    const before = JSON.stringify(findings);
    const out = await runAiPass({ scene: sc, findings, ignored: new Set(), settings: settings({ aiEnabled: true }), client: smartAi().client, cache: new AiCache(), signal: { cancelled: false } });
    expect(JSON.stringify(findings)).toBe(before);
    expect(out.extra.every((f) => f.ruleId.startsWith('ai-'))).toBe(true);
  });

  it('caché: una segunda pasada sin cambios no llama a la IA (salvo el resumen)', async () => {
    const cache = new AiCache();
    const first = smartAi();
    await run(first.client, { cache });
    const second = smartAi();
    const out = await run(second.client, { cache });
    expect(second.calls.map((c) => c.kind)).toEqual(['summary']);
    expect(out.aiNames['layer-default-name:f1']).toBe('Contenedor / Precio');
    expect(out.extra.map((f) => f.id).sort()).toEqual(['ai-case:b2-t', 'ai-spelling:t2', 'ai-spelling:t3']);
    expect(out.notes['component-missing-states:set']).toBeTruthy();
  });

  it('caché: si cambia un botón, las mayúsculas de todos se vuelven a revisar', async () => {
    const cache = new AiCache();
    const { sc, findings } = demo();
    const base = { findings, ignored: new Set<string>(), settings: settings({ aiEnabled: true }), cache, signal: { cancelled: false } };
    await runAiPass({ ...base, scene: sc, client: smartAi().client });
    sc.nodes['b1-t']!.text!.characters = 'Aceptar';
    const again = smartAi();
    await runAiPass({ ...base, scene: sc, client: again.client });
    const copyCall = again.calls.find((c) => c.kind === 'copy')!;
    expect(copyCall.user.textos.map((t: any) => t.texto).sort()).toEqual(['Aceptar', 'CANCELAR']);
  });

  it('respeta lo ignorado: no gasta en capas y textos que la persona descartó', async () => {
    const { client, calls } = smartAi();
    const { sc, findings } = demo();
    const ignored = new Set(['layer-default-name:f1', 'component-missing-states:set', 'ai-spelling:t2', 'ai-case:t2', 'ai-tone:t2', 'ai-spelling:t3', 'ai-case:t3', 'ai-tone:t3']);
    const out = await runAiPass({ scene: sc, findings, ignored, settings: settings({ aiEnabled: true }), client, cache: new AiCache(), signal: { cancelled: false } });
    expect(calls.map((c) => c.kind)).toEqual(['copy', 'summary']);
    expect(calls[0]!.user.textos.some((t: any) => t.texto === 'Contraseña inválda')).toBe(false);
    expect(out.aiNames).toEqual({});
  });

  it('una respuesta inválida (dos veces) descarta ese lote, avisa y no rompe el resto', async () => {
    const { client } = smartAi({ names: { names: 'no' } });
    const out = await run(client);
    expect(out.aiNames).toEqual({});
    expect(out.notice).toBe('1 lote de la IA se descartó por respuestas no válidas; el resto sí se aplicó.');
    expect(out.extra).toHaveLength(3);
    const { client: c2 } = smartAi({ names: { names: 'no' }, states: { sets: 'no' } });
    expect((await run(c2)).notice).toContain('2 lotes de la IA se descartaron');
  });

  it('si el resumen no es válido, simplemente no hay resumen', async () => {
    const out = await run(smartAi({ summary: { summary: 'x' } }).client);
    expect(out.summary).toBeUndefined();
  });

  it('el tope de gasto detiene la IA, conserva lo ya hecho y lo dice', async () => {
    const { client, calls } = smartAi();
    const tiny = settings({ aiEnabled: true, aiBudgetUsd: 0.0003 });
    const { sc, findings } = demo();
    const out = await runAiPass({ scene: sc, findings, ignored: new Set(), settings: tiny, client, cache: new AiCache(), signal: { cancelled: false } });
    expect(calls.length).toBeLessThan(4);
    expect(out.notice).toContain('se alcanzó el tope de < 0,01 USD');
    expect(out.spentUsd).toBeLessThanOrEqual(0.0003 + 0.0006);
  });

  it('con presupuesto cero no llama a nadie', async () => {
    const { client, calls } = smartAi();
    const { sc, findings } = demo();
    const out = await runAiPass({ scene: sc, findings, ignored: new Set(), settings: settings({ aiEnabled: true, aiBudgetUsd: 0 }), client, cache: new AiCache(), signal: { cancelled: false } });
    expect(calls).toHaveLength(0);
    expect(out.notice).toContain('tope');
    expect(out.calls).toBe(0);
  });

  it('cancelar entre lotes corta sin llamar más', async () => {
    const signal = { cancelled: false };
    const { client, calls } = smartAi();
    const { sc, findings } = demo();
    const wrapped: AiClient = { complete: async (r) => { const res = await client.complete(r); signal.cancelled = true; return res; } };
    const out = await runAiPass({ scene: sc, findings, ignored: new Set(), settings: settings({ aiEnabled: true }), client: wrapped, cache: new AiCache(), signal });
    expect(calls).toHaveLength(1);
    expect(out.summary).toBeUndefined();
  });

  it('los errores de clave, saldo y conexión se propagan para mostrarlos', async () => {
    for (const kind of ['ai-key-invalid', 'ai-no-credit', 'ai-offline', 'ai-rate-limit'] as const) {
      const client: AiClient = { complete: async () => { throw new AiError(kind, 'x'); } };
      await expect(run(client)).rejects.toMatchObject({ kind });
    }
  });

  it('el tono elegido llega al modelo', async () => {
    const seen: string[] = [];
    const client: AiClient = { complete: async (r) => { seen.push(r.system); return { text: '{"issues":[],"names":[],"sets":[],"summary":"Todo bien con este archivo de prueba."}', stopReason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }; } };
    const { sc, findings } = demo();
    await runAiPass({ scene: sc, findings, ignored: new Set(), settings: settings({ aiEnabled: true, tone: 'tu' }), client, cache: new AiCache(), signal: { cancelled: false } });
    expect(seen.some((s) => s.includes('«tú»'))).toBe(true);
  });
});

describe('textos candidatos', () => {
  it('descarta textos sin letras, muy cortos, muy largos, ocultos y duplicados lógicos', () => {
    const s = scene(frame('r', {}, [text('a', '12:30'), text('b', 'x'), text('c', 'y'.repeat(201)), text('d', 'Hola', { visible: false }), text('e', 'Hola mundo'), text('f', ' Hola mundo ')]));
    const jobs = collectCopyJobs(s, 'usted', new Set());
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ text: 'Hola mundo', nodeIds: ['e', 'f'], isButton: false });
  });
  it('tolera ciclos y nodos ausentes', () => {
    const s = scene(frame('r', {}, [text('a', 'Hola')]));
    s.nodes.r!.children.push('r', 'fantasma');
    expect(collectCopyJobs(s, 'usted', new Set())).toHaveLength(1);
  });
});

// ─────────────────────────── estimado antes de gastar ───────────────────────────
describe('estimado de costo', () => {
  it('cuenta capas, textos y sets, y compara con el tope', () => {
    const { sc, findings } = demo();
    const e = estimateAi(sc, findings, new Set(), settings({ aiEnabled: true }));
    expect(e).toMatchObject({ layers: 1, sets: 1, texts: 4, calls: 4, model: 'claude-haiku-5-5', budgetUsd: 0.25, overBudget: false });
    expect(e.costUsd).toBeGreaterThan(0);
    expect(e.costUsd).toBeLessThan(0.01);
    expect(needsConfirmation(e)).toBe(false);
    expect(estimateAi(sc, findings, new Set(), settings({ aiEnabled: true, aiBudgetUsd: 0.000001 })).overBudget).toBe(true);
  });
  it('lo que ya está en caché no se cobra', async () => {
    const cache = new AiCache();
    const { sc, findings } = demo();
    await runAiPass({ scene: sc, findings, ignored: new Set(), settings: settings({ aiEnabled: true }), client: smartAi().client, cache, signal: { cancelled: false } });
    expect(estimateAi(sc, findings, new Set(), settings({ aiEnabled: true }), cache)).toMatchObject({ layers: 0, sets: 0, texts: 0, calls: 1 });
  });
  it('pide confirmación en archivos grandes o caros', () => {
    const big = scene(frame('r', {}, Array.from({ length: 300 }, (_, i) => text(`t${i}`, `Texto número ${i} de la lista`))));
    const e = estimateAi(big, [], new Set(), settings({ aiEnabled: true }));
    expect(e.texts).toBe(300);
    expect(needsConfirmation(e)).toBe(true);
    const pricey = estimateAi(big, [], new Set(), settings({ aiEnabled: true, model: 'claude-opus-5-5' }));
    expect(pricey.costUsd).toBeGreaterThan(e.costUsd * 10);
    const few = scene(frame('r', {}, [text('a', 'Hola mundo')]));
    expect(needsConfirmation(estimateAi(few, [], new Set(), settings({ aiEnabled: true, model: 'claude-opus-5-5' })))).toBe(false);
  });
  it('lotes grandes se parten en varias llamadas', async () => {
    const big = scene(frame('r', {}, Array.from({ length: 130 }, (_, i) => text(`t${i}`, `Texto número ${i} de la lista`))));
    const calls: number[] = [];
    const client: AiClient = { complete: async (r) => { const u = JSON.parse(r.user); if (u.textos) calls.push(u.textos.length); return { text: JSON.stringify({ issues: [], summary: 'Un resumen suficientemente largo.' }), stopReason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }; } };
    await runAiPass({ scene: big, findings: [], ignored: new Set(), settings: settings({ aiEnabled: true }), client, cache: new AiCache(), signal: { cancelled: false } });
    expect(calls).toEqual([60, 60, 10]);
  });
});

