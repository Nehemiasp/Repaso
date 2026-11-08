import { describe, expect, it } from 'vitest';
import { box, frame, gradient, image, rect, scene, solid, text } from '../../tests/builders';
import { toHex } from './color';
import { isLargeText, requiredRatio, resolveBackground, topFill } from './contrast';

const bgOf = (s: ReturnType<typeof scene>, id = 't') => resolveBackground(s, s.nodes[id]!);
const hexOf = (s: ReturnType<typeof scene>): string => {
  const bg = bgOf(s);
  if (bg.kind !== 'color') throw new Error('se esperaba un color');
  return toHex(bg.color);
};

describe('resolveBackground', () => {
  it('sube por los padres hasta un relleno sólido', () => {
    const s = scene(frame('a', { fills: [solid('#FFFFFF')] }, [frame('b', {}, [text('t', 'Hola')])]));
    expect(bgOf(s)).toEqual({ kind: 'color', color: expect.objectContaining({ r: 1 }) });
  });
  it('sin fondo sólido en toda la cadena → no verificable (nunca asume blanco)', () => {
    const s = scene(frame('a', {}, [text('t', 'Hola')]));
    expect(bgOf(s)).toEqual({ kind: 'unverifiable', reason: 'no hay un fondo sólido detrás' });
  });
  it('imagen o degradado detrás → no verificable', () => {
    expect(bgOf(scene(frame('a', { fills: [image()] }, [text('t', 'x')])))).toEqual({ kind: 'unverifiable', reason: 'hay una imagen detrás' });
    expect(bgOf(scene(frame('a', { fills: [gradient()] }, [text('t', 'x')])))).toEqual({ kind: 'unverifiable', reason: 'hay un degradado detrás' });
  });
  it('usa el relleno visible más alto y salta rellenos ocultos o transparentes', () => {
    const hidden = { ...solid('#FF0000'), visible: false };
    const s = scene(frame('a', { fills: [solid('#00FF00'), hidden, solid('#0000FF', 0)] }, [text('t', 'x')]));
    expect(hexOf(s)).toBe('#00FF00');
  });
  it('un hermano de abajo que cubre el texto es el fondo (rectángulo de fondo)', () => {
    const s = scene(
      frame('a', { fills: [solid('#FFFFFF')] }, [
        rect('bg', { fills: [solid('#043565')], box: box(200, 100) }),
        text('t', 'x', { box: box(50, 20, 10, 10) }),
      ]),
    );
    expect(hexOf(s)).toBe('#043565');
  });
  it('ignora hermanos que no cubren, ocultos, de texto o ausentes', () => {
    const s = scene(
      frame('a', { fills: [solid('#FFFFFF')] }, [
        rect('chico', { fills: [solid('#FF0000')], box: box(5, 5) }),
        rect('oculto', { fills: [solid('#FF0000')], box: box(200, 200), visible: false }),
        text('otro', 'otro', { fills: [solid('#FF0000')], box: box(200, 200) }),
        text('t', 'x', { box: box(50, 20, 10, 10) }),
      ]),
    );
    s.nodes.a!.children.unshift('fantasma');
    expect(hexOf(s)).toBe('#FFFFFF');
  });
  it('un hermano sin relleno no tapa el fondo', () => {
    const s = scene(frame('a', { fills: [solid('#FFFFFF')] }, [rect('vacio', { box: box(200, 200) }), text('t', 'x', { box: box(10, 10) })]));
    expect(hexOf(s)).toBe('#FFFFFF');
  });
  it('compone fondos semitransparentes sobre el de abajo', () => {
    const s = scene(frame('a', { fills: [solid('#FFFFFF')] }, [frame('b', { fills: [solid('#000000', 0.5)] }, [text('t', 'x')])]));
    expect(hexOf(s)).toBe('#808080');
  });
  it('la opacidad del nodo cuenta', () => {
    const s = scene(frame('a', { fills: [solid('#FFFFFF')] }, [frame('b', { fills: [solid('#000000')], opacity: 0.5 }, [text('t', 'x')])]));
    expect(hexOf(s)).toBe('#808080');
  });
  it('tolera un padre ausente en la escena', () => {
    const s = scene(frame('a', {}, [text('t', 'x')]));
    s.nodes.t!.parentId = 'nada';
    expect(bgOf(s)).toEqual({ kind: 'unverifiable', reason: 'no hay un fondo sólido detrás' });
  });
});

describe('topFill', () => {
  it('sin relleno visible → none', () => {
    expect(topFill(scene(rect('r')).nodes.r!)).toEqual({ kind: 'none' });
  });
});

describe('umbrales WCAG', () => {
  it('texto grande', () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(19, 700)).toBe(true);
    expect(isLargeText(19, 400)).toBe(false);
    expect(isLargeText(14, 700)).toBe(false);
  });
  it('razón requerida', () => {
    expect(requiredRatio('AA', false)).toBe(4.5);
    expect(requiredRatio('AA', true)).toBe(3);
    expect(requiredRatio('AAA', false)).toBe(7);
    expect(requiredRatio('AAA', true)).toBe(4.5);
  });
});
