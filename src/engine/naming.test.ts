import { describe, expect, it } from 'vitest';
import { box, frame, image, node, rect, scene, solid, text } from '../../tests/builders';
import { isDefaultName, suggestNameByType } from './naming';

describe('isDefaultName', () => {
  it.each(['Frame 482', 'Rectangle 12', 'Group 3', 'Vector', 'Ellipse 1', ' Line 7 ', 'image 4', 'Boolean 2'])('«%s» es nombre por defecto', (n) => {
    expect(isDefaultName(n)).toBe(true);
  });
  it.each(['Botón principal', 'Frame de héroe', 'Tarjeta / Producto', 'Rectangle de fondo', 'Vector 3D'])('«%s» no lo es', (n) => {
    expect(isDefaultName(n)).toBe(false);
  });
});

describe('suggestNameByType', () => {
  const name = (spec: ReturnType<typeof frame>, id = spec.id) => {
    const s = scene(spec);
    return suggestNameByType(s.nodes[id]!, s);
  };
  it('rectángulos: imagen, fondo, rectángulo', () => {
    const s = scene(frame('p', { box: box(200, 200) }, [
      rect('img', { fills: [image()], box: box(50, 50) }),
      rect('bg', { box: box(200, 200) }),
      rect('r', { box: box(20, 20) }),
    ]));
    expect(suggestNameByType(s.nodes.img!, s)).toBe('Imagen');
    expect(suggestNameByType(s.nodes.bg!, s)).toBe('Fondo');
    expect(suggestNameByType(s.nodes.r!, s)).toBe('Rectángulo');
    // Sin padre no hay «fondo».
    expect(name(rect('solo', { box: box(200, 200) }))).toBe('Rectángulo');
  });
  it('elipses', () => {
    expect(name(node('e', 'ELLIPSE', { fills: [image()], box: box(40, 40) }))).toBe('Avatar');
    expect(name(node('e', 'ELLIPSE', { box: box(40, 40) }))).toBe('Círculo');
    expect(name(node('e', 'ELLIPSE', { fills: [image()], box: box(400, 400) }))).toBe('Círculo');
    expect(name(node('e', 'ELLIPSE', { box: box(40, 20) }))).toBe('Elipse');
  });
  it('líneas, vectores y contenedores simples', () => {
    expect(name(node('l', 'LINE'))).toBe('Divisor');
    expect(name(node('v', 'VECTOR', { box: box(16, 16) }))).toBe('Ícono');
    expect(name(node('v', 'STAR', { box: box(16, 16) }))).toBe('Ícono');
    expect(name(node('v', 'STAR', { box: box(16, 40) }))).toBe('Vector');
    expect(name(node('v', 'VECTOR', { box: box(100, 100) }))).toBe('Vector');
    expect(name(node('g', 'GROUP'))).toBe('Grupo');
    expect(name(node('s', 'SECTION'))).toBe('Sección');
  });
  it('botones: relleno o contorno', () => {
    expect(name(frame('b', { fills: [solid('#043565')], box: box(120, 44) }, [text('t', 'Enviar')]))).toBe('Botón / Relleno');
    expect(name(frame('b', { hasStroke: true, box: box(120, 44) }, [text('t', 'Enviar'), node('i', 'VECTOR', { box: box(16, 16) })]))).toBe('Botón / Contorno');
    // Un texto oculto no cuenta.
    expect(name(frame('b', { fills: [solid('#043565')], box: box(120, 44) }, [text('t', 'Enviar'), text('o', 'x', { visible: false })]))).toBe('Botón / Relleno');
  });
  it('pantalla, tarjeta, fila, columna, contenedor', () => {
    expect(name(frame('p', { box: box(390, 844) }))).toBe('Pantalla');
    const card = frame(
      'c',
      { fills: [solid('#FFFFFF')], radius: 8, box: box(200, 200), layout: { mode: 'VERTICAL', gap: 8, padL: 8, padR: 8, padT: 8, padB: 8 } },
      [text('a', 'A'), text('b', 'B')],
    );
    const s = scene(frame('root', { box: box(500, 500) }, [card]));
    expect(suggestNameByType(s.nodes.c!, s)).toBe('Tarjeta');
    const l = { gap: 0, padL: 0, padR: 0, padT: 0, padB: 0 };
    expect(name(frame('f', { box: box(100, 100), layout: { mode: 'HORIZONTAL', ...l } }, [text('a', 'A'), text('b', 'B')]))).toBe('Fila');
    expect(name(frame('f', { box: box(100, 100), layout: { mode: 'VERTICAL', ...l } }, [text('a', 'A'), text('b', 'B')]))).toBe('Columna');
    expect(name(frame('f', { box: box(100, 100) }))).toBe('Contenedor');
    // Con relleno pero sin radio no es tarjeta.
    expect(name(frame('f', { fills: [solid('#FFFFFF')], box: box(100, 100), layout: { mode: 'VERTICAL', ...l } }, [text('a', 'A'), text('b', 'B')]))).toBe('Columna');
  });
});
