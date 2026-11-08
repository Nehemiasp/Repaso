import { describe, expect, it } from 'vitest';
import { box, catalog, frame, gradient, image, node, rect, scene, settings, solid, text } from '../../../tests/builders';
import type { DocNode, Finding } from '../../shared/types';
import { RULE_BY_ID, RULES } from '../registry';
import type { RuleContext } from './types';

const ctxOf = (s: ReturnType<typeof scene>, over: Parameters<typeof settings>[0] = {}, cat = catalog()): RuleContext => ({
  scene: s,
  catalog: cat,
  settings: settings(over),
});
const run = (ruleId: keyof typeof RULE_BY_ID, s: ReturnType<typeof scene>, id: string, over: Parameters<typeof settings>[0] = {}, cat = catalog()): Finding[] =>
  RULE_BY_ID[ruleId].checkNode(s.nodes[id] as DocNode, ctxOf(s, over, cat));

describe('registro', () => {
  it('tiene las 9 reglas con id único, categoría y severidad', () => {
    expect(RULES).toHaveLength(9);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(9);
  });
});

describe('contrast', () => {
  const on = (fg: string, bg: string, props: Parameters<typeof text>[2] = {}) =>
    scene(frame('f', { fills: [solid(bg)] }, [text('t', 'Hola', { fills: [solid(fg)], ...props })]));
  it('aprueba texto con buen contraste', () => {
    expect(run('contrast', on('#000000', '#FFFFFF'), 't')).toEqual([]);
  });
  it('reprueba como alta entre 3 y el mínimo', () => {
    const [f] = run('contrast', on('#8A8A8A', '#FFFFFF'), 't'); // ≈ 3,45:1
    expect(f).toMatchObject({ ruleId: 'contrast', severity: 'high', status: 'fail', category: 'accessibility' });
    expect(f!.message).toContain('3,');
    expect(f!.detail).toContain('texto normal');
    // Sugerencia: oscurecer hasta un color que cumple, con muestra de color.
    expect(f!.suggestion).toEqual({ text: 'Oscurezca el texto a #767676 (4,5:1).', color: '#767676' });
  });
  it('sobre fondo oscuro sugiere aclarar; si no hay solución, dice que cambie el fondo', () => {
    const dark = run('contrast', on('#444444', '#111111'), 't')[0]!;
    expect(dark.suggestion!.text).toMatch(/^Aclare el texto a #[0-9A-F]{6} \(\d,\d:1\)\.$/);
    expect(dark.suggestion!.color).toMatch(/^#[0-9A-F]{6}$/);
    const none = run('contrast', on('#999999', '#777777'), 't', { contrastLevel: 'AAA' })[0]!;
    expect(none.suggestion).toEqual({ text: 'Ningún color de texto llega a ese nivel sobre este fondo: cambie el fondo.' });
  });
  it('reprueba como crítica bajo 3:1', () => {
    const [f] = run('contrast', on('#BBBBBB', '#FFFFFF'), 't');
    expect(f!.severity).toBe('critical');
  });
  it('texto grande exige menos', () => {
    const s = on('#8A8A8A', '#FFFFFF', { fontSize: 32 });
    expect(run('contrast', s, 't')).toEqual([]);
    expect(run('contrast', s, 't', { contrastLevel: 'AAA' })).toHaveLength(1); // 3,45 < 4,5 → falla en AAA
  });
  it('AAA es más estricto', () => {
    const s = on('#595959', '#FFFFFF'); // ≈ 7,0
    expect(run('contrast', s, 't')).toEqual([]);
    const s2 = on('#767676', '#FFFFFF'); // 4,54
    expect(run('contrast', s2, 't')).toEqual([]);
    expect(run('contrast', s2, 't', { contrastLevel: 'AAA' })[0]!.detail).toContain('7,0');
    // Texto grande con AAA pide 4,5.
    const s3 = on('#8A8A8A', '#FFFFFF', { fontSize: 32 });
    expect(run('contrast', s3, 't', { contrastLevel: 'AAA' })).toHaveLength(1);
    expect(run('contrast', s3, 't', { contrastLevel: 'AAA' })[0]!.detail).toContain('grande');
  });
  it('texto semitransparente se compone con el fondo', () => {
    const s = on('#000000', '#FFFFFF', { fills: [solid('#000000', 0.2)] });
    expect(run('contrast', s, 't')[0]!.severity).toBe('critical');
  });
  it('sobre imagen o degradado: no se pudo verificar, nunca aprobado', () => {
    for (const fill of [image(), gradient()]) {
      const s = scene(frame('f', { fills: [fill] }, [text('t', 'Hola')]));
      const [f] = run('contrast', s, 't');
      expect(f).toMatchObject({ status: 'unverifiable', severity: 'low', message: 'No se pudo verificar el contraste' });
    }
  });
  it('sin fondo sólido: no se pudo verificar', () => {
    const [f] = run('contrast', scene(frame('f', {}, [text('t', 'Hola')])), 't');
    expect(f!.status).toBe('unverifiable');
    expect(f!.detail).toContain('fondo sólido');
  });
  it('texto cuyo relleno es imagen o degradado: no verificable', () => {
    const s = scene(frame('f', { fills: [solid('#FFFFFF')] }, [text('t', 'Hola', { fills: [gradient()] })]));
    const [f] = run('contrast', s, 't');
    expect(f!.status).toBe('unverifiable');
    expect(f!.detail).toContain('en el texto');
  });
  it('ignora lo que no es texto o no tiene relleno', () => {
    const s = scene(frame('f', { fills: [solid('#FFFFFF')] }, [rect('r'), text('t', 'x', { fills: [] })]));
    expect(run('contrast', s, 'r')).toEqual([]);
    expect(run('contrast', s, 't')).toEqual([]);
    const sinInfo = scene(node('x', 'TEXT'));
    expect(run('contrast', sinInfo, 'x')).toEqual([]);
  });
});

describe('text-small', () => {
  it('aprueba el tamaño mínimo', () => {
    expect(run('text-small', scene(text('t', 'x', { fontSize: 12 })), 't')).toEqual([]);
  });
  it('media entre 10 y el mínimo, alta bajo 10', () => {
    expect(run('text-small', scene(text('t', 'x', { fontSize: 11 })), 't')[0]).toMatchObject({ severity: 'medium', message: 'Texto muy pequeño (11 px)', suggestion: { text: 'Suba el texto a 12 px o más.' } });
    expect(run('text-small', scene(text('t', 'x', { fontSize: 9.5 })), 't')[0]).toMatchObject({ severity: 'high', message: 'Texto muy pequeño (9,5 px)' });
  });
  it('respeta el umbral configurable', () => {
    expect(run('text-small', scene(text('t', 'x', { fontSize: 14 })), 't', { minTextSize: 16 })).toHaveLength(1);
  });
  it('ignora nodos que no son texto', () => {
    expect(run('text-small', scene(rect('r')), 'r')).toEqual([]);
    expect(run('text-small', scene(node('x', 'TEXT')), 'x')).toEqual([]);
  });
});

describe('touch-target', () => {
  const btn = (w: number, h: number, name = 'Botón') => scene(node('b', 'INSTANCE', { name, box: box(w, h) }));
  it('marca interactivos pequeños', () => {
    const t = run('touch-target', btn(32, 24), 'b')[0]!;
    expect(t).toMatchObject({ severity: 'high', message: 'Área táctil de 32 × 24 px' });
    // La sugerencia no empuja a un cuadrado: mantiene el alto y deja que el ancho siga al texto.
    expect(t.suggestion!.text).toContain('mantenga el alto en 44 px');
    expect(t.suggestion!.text).toContain('sin forzar un cuadrado');
  });
  it('aprueba el tamaño recomendado', () => {
    expect(run('touch-target', btn(44, 44), 'b')).toEqual([]);
  });
  it('revisa alto y ancho por separado', () => {
    expect(run('touch-target', btn(120, 30), 'b')).toHaveLength(1);
    expect(run('touch-target', btn(30, 120), 'b')).toHaveLength(1);
  });
  it('no toca lo que no es interactivo ni otros tipos', () => {
    expect(run('touch-target', btn(10, 10, 'Tarjeta'), 'b')).toEqual([]);
    expect(run('touch-target', scene(frame('b', { name: 'Botón', box: box(10, 10) })), 'b')).toEqual([]);
  });
  it('umbral configurable', () => {
    expect(run('touch-target', btn(44, 44), 'b', { minTouchTarget: 48 })).toHaveLength(1);
  });
  it('detecta interactivos por propiedad de estado', () => {
    const s = scene(node('b', 'INSTANCE', { name: 'Elemento', box: box(20, 20), component: { kind: 'instance', props: { State: 'Default' } } }));
    expect(run('touch-target', s, 'b')).toHaveLength(1);
  });
});

describe('layer-default-name', () => {
  it('marca nombres por defecto y propone un nombre por tipo', () => {
    const s = scene(frame('f', { name: 'Frame 482', box: box(300, 80), layout: { mode: 'HORIZONTAL', gap: 4, padL: 0, padR: 0, padT: 0, padB: 0 } }, [text('a', 'A'), text('b', 'B')]));
    const [f] = run('layer-default-name', s, 'f');
    expect(f).toMatchObject({ severity: 'low', category: 'order', message: 'Capa sin nombre («Frame 482»)', fix: { kind: 'rename', suggested: 'Fila' } });
  });
  it('no marca nombres con sentido, textos, instancias ni capas dentro de instancias', () => {
    const s = scene(
      frame('ok', { name: 'Encabezado' }),
      text('t', 'Frame 1'),
      node('i', 'INSTANCE', { name: 'Frame 3' }),
      rect('in', { name: 'Rectangle 4', inInstance: true }),
    );
    for (const id of ['ok', 't', 'i', 'in']) expect(run('layer-default-name', s, id)).toEqual([]);
  });
});

describe('fill-no-style y color-near-style', () => {
  const cat = catalog({ colors: [['Marca/Azul', '#043565']] });
  const withFill = (fill: ReturnType<typeof solid>, props: Partial<DocNode> = {}) => scene(rect('r', { fills: [fill], ...props }));
  it('fill-no-style: color sin estilo ni variable, sin coincidencia', () => {
    const [f] = run('fill-no-style', withFill(solid('#FF8800')), 'r', {}, cat);
    expect(f).toMatchObject({ ruleId: 'fill-no-style', severity: 'medium', category: 'styles', message: 'Color #FF8800 sin estilo ni variable' });
    expect(f!.fix).toBeUndefined();
    expect(run('color-near-style', withFill(solid('#FF8800')), 'r', {}, cat)).toEqual([]);
  });
  it('fill-no-style: catálogo vacío → sin corrección', () => {
    const [f] = run('fill-no-style', withFill(solid('#FF8800')), 'r');
    expect(f!.fix).toBeUndefined();
    expect(run('color-near-style', withFill(solid('#FF8800')), 'r')).toEqual([]);
  });
  it('fill-no-style: igual a un estilo → ofrece aplicarlo', () => {
    const [f] = run('fill-no-style', withFill(solid('#043565')), 'r', {}, cat);
    expect(f).toMatchObject({ detail: 'Es el mismo color que «Marca/Azul».', fix: { kind: 'apply-color', styleName: 'Marca/Azul', source: 'style' } });
    expect(run('color-near-style', withFill(solid('#043565')), 'r', {}, cat)).toEqual([]);
  });
  it('color-near-style: casi igual (y fill-no-style no lo duplica)', () => {
    const s = withFill(solid('#073A6A'));
    expect(run('fill-no-style', s, 'r', {}, cat)).toEqual([]);
    const [f] = run('color-near-style', s, 'r', {}, cat);
    expect(f).toMatchObject({ ruleId: 'color-near-style', severity: 'low', fix: { kind: 'apply-color', styleName: 'Marca/Azul' } });
    expect(f!.message).toBe('Color #073A6A casi igual a «Marca/Azul»');
    expect(f!.detail).toMatch(/ΔE \d,\d/);
  });
  it('la tolerancia es configurable', () => {
    const s = withFill(solid('#073A6A'));
    expect(run('color-near-style', s, 'r', { colorTolerance: 0.6 }, cat)).toEqual([]);
    expect(run('fill-no-style', s, 'r', { colorTolerance: 0.6 }, cat)).toHaveLength(1);
  });
  it('rellenos con estilo o variable, imagen, degradado, ocultos o dentro de instancias no se marcan', () => {
    const casos = [
      withFill(solid('#FF8800', 1, { styleId: 'S:1' })),
      withFill(solid('#FF8800', 1, { variableId: 'V:1' })),
      withFill(image()),
      withFill(gradient()),
      withFill({ ...solid('#FF8800'), visible: false }),
      withFill(solid('#FF8800'), { inInstance: true }),
      scene(rect('r')),
    ];
    for (const s of casos) {
      expect(run('fill-no-style', s, 'r', {}, cat)).toEqual([]);
      expect(run('color-near-style', s, 'r', {}, cat)).toEqual([]);
    }
  });
  it('audita el relleno de arriba', () => {
    const s = scene(rect('r', { fills: [solid('#FF0000'), solid('#043565')] }));
    expect(run('fill-no-style', s, 'r', {}, cat)[0]!.message).toContain('#043565');
  });
  it('variables ganan en empate', () => {
    const c = catalog({ colors: [['Estilo', '#043565', 'style'], ['Var', '#043565', 'variable']] });
    expect(run('fill-no-style', withFill(solid('#043565')), 'r', {}, c)[0]!.fix).toMatchObject({ source: 'variable', styleName: 'Var' });
  });
});

describe('text-no-style', () => {
  const cat = catalog({ texts: [['Cuerpo', 'Inter', 16, 400]] });
  it('marca texto sin estilo y propone el más parecido', () => {
    const [f] = run('text-no-style', scene(text('t', 'Hola mundo', { fontSize: 16 })), 't', {}, cat);
    expect(f).toMatchObject({ severity: 'medium', message: 'Texto sin estilo de texto («Hola mundo»)', fix: { kind: 'apply-text-style', styleName: 'Cuerpo' } });
  });
  it('sin estilo parecido: sin corrección', () => {
    const [f] = run('text-no-style', scene(text('t', 'Hola', { fontSize: 60 })), 't', {}, cat);
    expect(f!.fix).toBeUndefined();
    expect(f!.detail).toBeUndefined();
  });
  it('no marca texto con estilo, dentro de instancias, ni otros nodos', () => {
    expect(run('text-no-style', scene(text('t', 'x', { textStyleId: 'S:9' })), 't')).toEqual([]);
    expect(run('text-no-style', scene(text('t', 'x', { inInstance: true })), 't')).toEqual([]);
    expect(run('text-no-style', scene(rect('r')), 'r')).toEqual([]);
    expect(run('text-no-style', scene(node('x', 'TEXT')), 'x')).toEqual([]);
  });
});

describe('spacing-off-scale', () => {
  const L = (o: Partial<NonNullable<DocNode['layout']>> = {}) => ({ mode: 'VERTICAL' as const, gap: 8, padL: 16, padR: 16, padT: 16, padB: 16, ...o });
  it('marca gap y padding fuera de la rejilla y propone el cercano', () => {
    const [f] = run('spacing-off-scale', scene(frame('f', { layout: L({ gap: 13, padT: 5 }) })), 'f');
    expect(f).toMatchObject({
      severity: 'medium',
      category: 'spacing',
      message: 'Espaciado fuera de la rejilla de 4 px',
      detail: 'espacio 13 → 12, relleno sup. 5 → 4',
      fix: { kind: 'snap-spacing', changes: [{ prop: 'gap', from: 13, to: 12 }, { prop: 'padT', from: 5, to: 4 }] },
    });
  });
  it('rejilla de 8 px', () => {
    expect(run('spacing-off-scale', scene(frame('f', { layout: L({ gap: 12 }) })), 'f', { spacingGrid: 8 })).toHaveLength(1);
    expect(run('spacing-off-scale', scene(frame('f', { layout: L({ gap: 12 }) })), 'f')).toEqual([]);
  });
  it('sin auto layout, en instancias o con gap automático no marca', () => {
    expect(run('spacing-off-scale', scene(frame('f')), 'f')).toEqual([]);
    expect(run('spacing-off-scale', scene(frame('f', { layout: L({ gap: 13 }), inInstance: true })), 'f')).toEqual([]);
    expect(run('spacing-off-scale', scene(frame('f', { layout: L({ gap: 13, gapAuto: true }) })), 'f')).toEqual([]);
    expect(run('spacing-off-scale', scene(frame('f', { layout: L({ mode: 'NONE', gap: 13 }) })), 'f')).toEqual([]);
  });
});

describe('component-missing-states', () => {
  const set = (name: string, options?: Record<string, string[]>) =>
    scene(node('s', 'COMPONENT_SET', { name, ...(options ? { component: { kind: 'set', variantOptions: options } } : {}) }));
  it('botón con todos sus estados: sin hallazgos', () => {
    expect(run('component-missing-states', set('Botón', { Estado: ['Normal', 'Hover', 'Foco', 'Deshabilitado'] }), 's')).toEqual([]);
    expect(run('component-missing-states', set('Button', { State: ['Default', 'Hovered', 'Focused', 'Disabled'] }), 's')).toEqual([]);
  });
  it('faltan varios: alta; falta uno: media', () => {
    const [a] = run('component-missing-states', set('Botón', { State: ['Default', 'Hover'] }), 's');
    expect(a).toMatchObject({ severity: 'high', category: 'components', message: 'Faltan estados: foco, deshabilitado', detail: 'Tiene: Default, Hover.' });
    const [b] = run('component-missing-states', set('Botón', { State: ['Default', 'Hover', 'Focus'] }), 's');
    expect(b).toMatchObject({ severity: 'medium', message: 'Faltan estados: deshabilitado' });
  });
  it('campos también piden «error»', () => {
    const [f] = run('component-missing-states', set('Input / Texto', { State: ['Default', 'Hover', 'Focus', 'Disabled'] }), 's');
    expect(f!.message).toBe('Faltan estados: error');
    expect(run('component-missing-states', set('Input / Texto', { State: ['Hover', 'Focus', 'Disabled', 'Error'] }), 's')).toEqual([]);
  });
  it('propiedad de estado sin opciones', () => {
    expect(run('component-missing-states', set('Botón', { State: [] }), 's')[0]!.detail).toBe('Tiene: ninguno.');
  });
  it('interactivo sin propiedad de estado', () => {
    const [f] = run('component-missing-states', set('Botón', { Size: ['S', 'M'] }), 's');
    expect(f).toMatchObject({ severity: 'high', message: 'Componente interactivo sin propiedad de estado' });
  });
  it('no interactivo sin propiedad de estado: nada. Con propiedad: se revisa igual', () => {
    expect(run('component-missing-states', set('Tarjeta', { Size: ['S'] }), 's')).toEqual([]);
    expect(run('component-missing-states', set('Tarjeta', { Estado: ['Normal'] }), 's')).toHaveLength(1);
  });
  it('ignora lo que no es set o no trae variantes', () => {
    expect(run('component-missing-states', scene(node('s', 'COMPONENT', { name: 'Botón' })), 's')).toEqual([]);
    expect(run('component-missing-states', set('Botón'), 's')).toEqual([]);
  });
});
