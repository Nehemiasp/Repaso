// Datos de ejemplo para la galería. Los hallazgos salen del motor real, no se inventan a mano.
import archivoPrueba from '../../fixtures/archivo-prueba.json';
import { runRules } from '../../src/engine';
import type { FixPreview, ReviewMeta, ReviewPayload } from '../../src/shared/messages';
import type { Finding, Scene, StyleCatalog } from '../../src/shared/types';
import { box, catalog, frame, image, node, rect, scene, settings, solid, text, type Spec } from '../../tests/builders';

/** Hora fija: la galería es determinista. */
export const NOW = Date.UTC(2026, 10, 8, 15, 30, 0);

export const meta = (over: Partial<ReviewMeta> = {}): ReviewMeta => ({ scope: 'selection', nodeCount: 1240, durationMs: 840, at: NOW - 12_000, ...over });

const run = (s: Scene, c: StyleCatalog = catalog()) => runRules(s, c, settings()).findings;
const payload = (findings: Finding[], over: Partial<ReviewPayload> = {}): ReviewPayload => ({ findings, ignoredIds: [], meta: meta(), ...over });

/** El archivo de prueba de fase 1, tal cual. */
export const testFileFindings: Finding[] = run((archivoPrueba as { scene: Scene }).scene, (archivoPrueba as { catalog: StyleCatalog }).catalog);

const LONG = 'Sección de héroe / Contenedor principal con tarjetas de producto, precios y descripción extensa para probar el truncado de nombres de capa';

/** Escena grande con defectos repartidos; `n` capas. */
function bigScene(n: number, longNames = false): Scene {
  const kids: Spec[] = [];
  for (let i = 0; i < n; i++) {
    const nm = longNames && i % 3 === 0 ? `${LONG} ${i}` : undefined;
    switch (i % 9) {
      case 0: kids.push(rect(`r${i}`, { name: nm ?? `Rectangle ${i}`, fills: [solid('#F2F4F7', 1, { styleId: 'S:1' })] })); break;
      case 1: kids.push(frame(`f${i}`, { name: nm ?? `Frame ${i}`, layout: { mode: 'VERTICAL', gap: 13, padL: 10, padR: 10, padT: 10, padB: 10 } })); break;
      case 2: kids.push(rect(`c${i}`, { name: nm ?? `Muestra ${i}`, fills: [solid('#FF8800')] })); break;
      case 3: kids.push(text(`t${i}`, nm ?? `Texto gris ${i}`, { fills: [solid('#BBBBBB', 1, { styleId: 'S:1' })], textStyleId: 'S:2' })); break;
      case 4: kids.push(text(`s${i}`, nm ?? `Letra chica ${i}`, { fontSize: 10, fills: [solid('#111111', 1, { styleId: 'S:1' })], textStyleId: 'S:2' })); break;
      case 5: kids.push(node(`b${i}`, 'INSTANCE', { name: nm ?? `Botón ${i}`, box: box(28, 28), component: { kind: 'instance', props: { State: 'Default' } } })); break;
      case 6: kids.push(text(`n${i}`, nm ?? `Sin estilo ${i}`, { fills: [solid('#111111', 1, { styleId: 'S:1' })] })); break;
      case 7: kids.push(rect(`i${i}`, { name: nm ?? `Foto ${i}`, fills: [image()] })); break;
      default: kids.push(text(`u${i}`, nm ?? `Sobre foto ${i}`, { fills: [solid('#111111', 1, { styleId: 'S:1' })], textStyleId: 'S:2' }));
    }
  }
  return scene(frame('root', { name: 'Pantalla', fills: [solid('#FFFFFF', 1, { styleId: 'S:1' })], box: box(390, 20000) }, kids));
}

const big = run(bigScene(400));
export const findings200: Finding[] = big.slice(0, 200);
export const longNameFindings: Finding[] = run(bigScene(40, true)).filter((f) => f.nodeName.length > 60).slice(0, 8).concat(testFileFindings.slice(0, 4));

export const singleCategoryFindings: Finding[] = run(
  scene(
    frame('root', { name: 'Tarjetas', fills: [solid('#FFFFFF', 1, { styleId: 'S:1' })], box: box(390, 900) },
      Array.from({ length: 9 }, (_, i) => frame(`g${i}`, { name: `Tarjeta ${i + 1}`, layout: { mode: 'VERTICAL', gap: 10 + i, padL: 16, padR: 16, padT: 14, padB: 16 } }))),
  ),
).filter((f) => f.category === 'spacing');

export const unverifiedFindings: Finding[] = run(
  scene(frame('root', { name: 'Héroe', box: box(390, 400) }, [
    rect('foto', { name: 'Foto de portada', fills: [image()], box: box(390, 400) }),
    text('h1', 'Título sobre la foto', { textStyleId: 'S:2', fills: [solid('#FFFFFF', 1, { styleId: 'S:1' })] }),
    text('h2', 'Subtítulo sobre la foto', { textStyleId: 'S:2', fills: [solid('#FFFFFF', 1, { styleId: 'S:1' })] }),
  ])),
);

export const aiSummary =
  'El archivo tiene una base de color sólida, pero 12 textos no cumplen el contraste mínimo y 34 capas conservan nombres por defecto. Empiece por los hallazgos críticos de accesibilidad; el resto se puede corregir en lote.';

export const reviewPayload = (findings: Finding[], over: Partial<ReviewPayload> = {}) => payload(findings, over);

const preview = (kind: FixPreview['kind'], rows: [string, string, string, ('ai' | 'type')?][]): FixPreview => ({
  kind,
  items: rows.map(([nodeName, before, after, source], i) => ({ findingId: `${kind}:${i}`, nodeId: `n${i}`, nodeName, before, after, ...(source ? { source } : {}) })),
});

const names = ['Tarjeta / Producto', 'Tarjeta / Producto / Precio', 'Botón / Relleno', 'Fila', 'Columna', 'Encabezado / Navegación', 'Ícono', 'Avatar', 'Divisor', 'Imagen / Portada', 'Pastilla / Etiqueta', 'Lista / Elemento'];
export const renamePreview34: FixPreview = preview(
  'rename',
  Array.from({ length: 34 }, (_, i) => [`Frame ${482 + i}`, `Frame ${482 + i}`, `${names[i % names.length]}${i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''}`, i % 4 === 3 ? 'type' : 'ai'] as [string, string, string, 'ai' | 'type']),
);
export const colorPreview: FixPreview = preview('apply-color', [
  ['Muestra casi azul', '#073A6A', 'Marca/Azul (#043565)'],
  ['Fondo de tarjeta', '#F3F4F7', 'Fondo/Gris (#F2F4F7)'],
  ['Borde sutil', '#E5E7EB', 'Borde/Suave (variable)'],
  ['Texto secundario', '#6B6B6B', 'Texto/Secundario (variable)'],
]);
export const textPreview: FixPreview = preview('apply-text-style', [
  ['Título de la tarjeta', 'Inter 24 / Bold', 'Título'],
  ['Descripción', 'Inter 15 / Regular', 'Cuerpo (Inter 16)'],
  ['Etiqueta', 'Inter 12 / Medium', 'Etiqueta'],
]);
export const spacingPreview: FixPreview = preview('snap-spacing', [
  ['Tarjeta 1', 'gap 13 · pad 10', 'gap 12 · pad 12'],
  ['Tarjeta 2', 'gap 10', 'gap 12'],
  ['Fila de acciones', 'pad sup. 5', 'pad sup. 4'],
  ['Lista', 'gap 6', 'gap 8'],
]);
