// Genera fixtures/*.json a partir de las ayudas de pruebas. Ejecutar: npx tsx scripts/gen-fixtures.ts
import { writeFileSync } from 'node:fs';
import { box, catalog, frame, gradient, image, node, rect, scene, solid, text, type Spec } from '../tests/builders';

const cat = catalog({
  colors: [
    ['Marca/Azul', '#043565'],
    ['Texto/Principal', '#111111'],
    ['Fondo/Blanco', '#FFFFFF'],
    ['Fondo/Gris', '#F2F4F7'],
  ],
  texts: [
    ['Cuerpo', 'Inter', 16, 400],
    ['Título', 'Inter', 24, 700],
    ['Etiqueta', 'Inter', 12, 500],
  ],
});

const L = (o: object = {}) => ({ mode: 'VERTICAL' as const, gap: 8, padL: 16, padR: 16, padT: 16, padB: 16, ...o });
const bgWhite = () => [solid('#FFFFFF', 1, { styleId: 'S:color2' })];
const ink = () => [solid('#111111', 1, { styleId: 'S:color1' })];
/** Texto correcto: con estilo de texto y color con estilo. */
const ok = (id: string, s: string, size = 16, extra: object = {}) =>
  text(id, s, { fontSize: size, fills: ink(), textStyleId: size === 24 ? 'S:text1' : size === 12 ? 'S:text2' : 'S:text0', ...extra });
const card = (id: string, name: string, kids: Spec[], extra: object = {}) =>
  frame(id, { name, fills: bgWhite(), box: box(358, 120), layout: L(), ...extra }, kids);

// ───────────────────────── Archivo con errores a propósito ─────────────────────────
const bad = scene(
  frame('pantalla', { name: 'Archivo de prueba', fills: bgWhite(), box: box(390, 1400) }, [
    card('e01', 'E01 · Contraste', [ok('e01-texto', 'Texto gris claro', 16, { fills: [solid('#B0B0B0', 1, { styleId: 'S:color1' })] })]),
    card('e01b', 'E01b · Contraste sobre imagen', [rect('e01b-foto', { name: 'Foto', fills: [image()], box: box(358, 120) }), ok('e01b-texto', 'Texto sobre foto')], {
      fills: [],
    }),
    card('e02', 'E02 · Texto pequeño', [ok('e02-texto', 'Letra de 11 px', 11)]),
    card('e03', 'E03 · Área táctil', [
      node('e03-boton', 'INSTANCE', { name: 'Botón / Principal', box: box(32, 24), component: { kind: 'instance', props: { State: 'Default' }, mainName: 'Botón' } }),
    ]),
    card('e04', 'E04 · Capas sin nombre', [
      frame('e04-frame', { name: 'Frame 482', box: box(100, 40), layout: L({ mode: 'HORIZONTAL' }) }, [ok('e04-texto', 'Contenido')]),
      rect('e04-rect', { name: 'Rectangle 12', fills: [solid('#F2F4F7', 1, { styleId: 'S:color3' })], box: box(40, 40) }),
    ]),
    card('e05', 'E05 · Relleno sin estilo', [rect('e05-rect', { name: 'Muestra naranja', fills: [solid('#FF8800')], box: box(40, 40) })]),
    card('e06', 'E06 · Color casi igual a un estilo', [rect('e06-rect', { name: 'Muestra casi azul', fills: [solid('#073A6A')], box: box(40, 40) })]),
    card('e07', 'E07 · Texto sin estilo', [text('e07-texto', 'Texto sin estilo de texto', { fontSize: 16, fills: ink() })]),
    card('e08', 'E08 · Espaciado fuera de escala', [ok('e08-texto', 'Gap 13 y relleno 10')], { layout: L({ gap: 13, padT: 10 }) }),
    node('e09-set', 'COMPONENT_SET', {
      name: 'Botón',
      box: box(300, 120),
      component: { kind: 'set', variantOptions: { Estado: ['Normal', 'Hover'] } },
    }),
  ]),
);

const badExpected = [
  'contrast:e01-texto',
  'contrast:e01b-texto',
  'text-small:e02-texto',
  'touch-target:e03-boton',
  'layer-default-name:e04-frame',
  'layer-default-name:e04-rect',
  'fill-no-style:e05-rect',
  'color-near-style:e06-rect',
  'text-no-style:e07-texto',
  'spacing-off-scale:e08',
  'component-missing-states:e09-set',
].sort();

writeFileSync('fixtures/archivo-prueba.json', JSON.stringify({ catalog: cat, scene: bad, expectedFindings: badExpected }, null, 2) + '\n');

// ───────────────────────── Archivo limpio ─────────────────────────
const clean = scene(
  frame('pantalla', { name: 'Pantalla / Inicio', fills: bgWhite(), box: box(390, 844), layout: L({ gap: 16, padL: 24, padR: 24, padT: 24, padB: 24 }) }, [
    ok('titulo', 'Bienvenida', 24),
    ok('cuerpo', 'Revise su diseño antes de entregarlo a desarrollo.'),
    frame('boton', { name: 'Botón / Relleno', fills: [solid('#043565', 1, { styleId: 'S:color0' })], box: box(342, 48), radius: 8, layout: L({ mode: 'HORIZONTAL', gap: 8, padT: 12, padB: 12 }) }, [
      ok('boton-texto', 'Revisar', 16, { fills: [solid('#FFFFFF', 1, { styleId: 'S:color2' })] }),
    ]),
    node('boton-inst', 'INSTANCE', { name: 'Botón / Secundario', box: box(342, 48), component: { kind: 'instance', props: { Estado: 'Normal' }, mainName: 'Botón' } }),
    node('boton-set', 'COMPONENT_SET', {
      name: 'Botón',
      box: box(300, 120),
      component: { kind: 'set', variantOptions: { Estado: ['Normal', 'Hover', 'Foco', 'Deshabilitado'] } },
    }),
    // Texto grande sobre degradado de marca ya revisado a mano: no se incluye para no dar «no verificable».
  ]),
);
writeFileSync('fixtures/archivo-limpio.json', JSON.stringify({ catalog: cat, scene: clean }, null, 2) + '\n');

// ───────────────────────── Textos con errores a propósito (fase 4–5) ─────────────────────────
interface Expected {
  nodeId: string;
  kind: 'spelling' | 'case' | 'tone';
  suggested: string;
}
const btn = (id: string, label: string) =>
  frame(id, { name: `Botón / ${id}`, fills: [solid('#043565', 1, { styleId: 'S:color0' })], box: box(120, 48), layout: L({ mode: 'HORIZONTAL', gap: 8, padT: 12, padB: 12 }) }, [
    ok(`${id}-t`, label, 16, { fills: [solid('#FFFFFF', 1, { styleId: 'S:color2' })] }),
  ]);
const copyScene = scene(
  frame('pantalla', { name: 'Formulario de contacto', fills: bgWhite(), box: box(390, 844), layout: L({ gap: 16, padL: 24, padR: 24, padT: 24, padB: 24 }) }, [
    ok('t-titulo', 'Contáctenos', 24),
    ok('t-intro', 'Cuéntenos en qué podemos ayudarle.'),
    ok('t-ok-1', 'Ingrese su correo electrónico'),
    ok('t-ok-2', 'Su mensaje se enviará de inmediato.'),
    ok('t-ok-3', 'Gracias por escribirnos.'),
    ok('t-ok-4', 'Revise los campos marcados.'),
    // Errores a propósito:
    ok('t-err-orto-1', 'Contraseña inválda'),
    ok('t-err-orto-2', 'Enviar infomación'),
    ok('t-err-orto-3', 'Ocurrió un eror inesperado'),
    ok('t-err-tuteo-1', 'Ingresa tu nombre completo'),
    ok('t-err-tuteo-2', 'Si tienes dudas, escríbenos'),
    btn('b-guardar', 'Guardar'),
    btn('b-cancelar', 'CANCELAR'),
    btn('b-aceptar', 'aceptar'),
    btn('b-enviar', 'Enviar'),
  ]),
);
const copyExpected: Expected[] = [
  { nodeId: 't-err-orto-1', kind: 'spelling', suggested: 'Contraseña inválida' },
  { nodeId: 't-err-orto-2', kind: 'spelling', suggested: 'Enviar información' },
  { nodeId: 't-err-orto-3', kind: 'spelling', suggested: 'Ocurrió un error inesperado' },
  { nodeId: 't-err-tuteo-1', kind: 'tone', suggested: 'Ingrese su nombre completo' },
  { nodeId: 't-err-tuteo-2', kind: 'tone', suggested: 'Si tiene dudas, escríbanos' },
  { nodeId: 'b-cancelar-t', kind: 'case', suggested: 'Cancelar' },
  { nodeId: 'b-aceptar-t', kind: 'case', suggested: 'Aceptar' },
];
writeFileSync('fixtures/textos-con-errores.json', JSON.stringify({ catalog: cat, scene: copyScene, tone: 'usted', expected: copyExpected }, null, 2) + '\n');
console.log('Fixtures generados.');
void gradient;
