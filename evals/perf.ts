// Rendimiento: lectura por partes + reglas en archivos de 500 a 20 000 capas, y cuánto dura el tramo más largo sin ceder el hilo.
//
// OJO: se mide con nodos simulados en Node. Leer propiedades de nodos reales de Figma cuesta mucho más
// (cada lectura cruza al editor), así que estos tiempos son un PISO. Lo que sí demuestra esta medición es
// que el código cede el hilo cada ~8 ms sin importar el tamaño. Falta medirlo en Figma (docs/verificacion-manual.md).
import { performance } from 'node:perf_hooks';
import { runRulesAsync } from '../src/engine';
import { readScope } from '../src/read/traverse';
import { catalog, settings } from '../tests/builders';
import { median, save } from './util';

type M = Record<string, unknown> & { id: string; type: string; children?: M[]; parent?: M | null };

/** Árbol con ~n capas: tarjetas con texto, rectángulos, instancias y auto layout, con defectos repartidos. */
function mockTree(n: number): M {
  let id = 0;
  const mk = (type: string, props: Record<string, unknown> = {}): M => ({ id: `${++id}:1`, type, name: type === 'TEXT' ? 'Texto' : `Frame ${id}`, width: 100, height: 40, x: 0, y: 0, visible: true, opacity: 1, fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }], ...props });
  const root = mk('FRAME', { children: [], layoutMode: 'VERTICAL', itemSpacing: 8, paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 16 });
  const cards: M[] = [];
  while (id < n) {
    const card = mk('FRAME', { children: [], layoutMode: 'VERTICAL', itemSpacing: id % 5 === 0 ? 13 : 8, paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 16, parent: root });
    for (let k = 0; k < 6 && id < n; k++) {
      const kind = k % 3;
      (card.children as M[]).push(
        kind === 0
          ? mk('TEXT', { characters: 'Texto de ejemplo', fontSize: id % 7 === 0 ? 10 : 16, fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, textStyleId: id % 2 ? 'S:1' : '', fills: [{ type: 'SOLID', color: id % 4 === 0 ? { r: 0.7, g: 0.7, b: 0.7 } : { r: 0, g: 0, b: 0 } }], parent: card })
          : kind === 1
            ? mk('RECTANGLE', { name: `Rectangle ${id}`, parent: card })
            : mk('INSTANCE', { name: 'Botón', width: 32, height: 24, componentProperties: { State: { value: 'Default' } }, getMainComponentAsync: async () => null, children: [], parent: card }),
      );
    }
    cards.push(card);
  }
  (root.children as M[]).push(...cards);
  const link = (m: M, p: M | null) => {
    m.parent = p;
    (m.children ?? []).forEach((c) => link(c, m));
  };
  link(root, null);
  return root;
}

const env = { mixed: Symbol('mixed') };
const SIZES = [500, 2000, 5000, 20000];

async function once(n: number) {
  const tree = mockTree(n);
  let last = performance.now();
  let maxSlice = 0;
  let yields = 0;
  const yieldFn = async () => {
    const now = performance.now();
    maxSlice = Math.max(maxSlice, now - last);
    yields += 1;
    await new Promise<void>((r) => setTimeout(r, 0));
    last = performance.now();
  };
  const t0 = performance.now();
  const scene = await readScope({ env, roots: [tree as unknown as SceneNode], skipHidden: true, maxNodes: 50_000, yieldFn });
  const t1 = performance.now();
  last = performance.now();
  const result = await runRulesAsync(scene!, catalog(), settings(), { yieldFn });
  const t2 = performance.now();
  return { capas: result!.nodeCount, hallazgos: result!.findings.length, lecturaMs: t1 - t0, reglasMs: t2 - t1, totalMs: t2 - t0, tramoMaxMs: maxSlice, cesiones: yields };
}

const rows: Record<string, number>[] = [];
for (const n of SIZES) {
  const runs: Awaited<ReturnType<typeof once>>[] = [];
  for (let i = 0; i < 5; i++) runs.push(await once(n));
  const pick = (k: 'lecturaMs' | 'reglasMs' | 'totalMs' | 'tramoMaxMs') => median(runs.map((r) => r[k]));
  rows.push({
    objetivo: n,
    capas: runs[0]!.capas,
    hallazgos: runs[0]!.hallazgos,
    lecturaMs: Math.round(pick('lecturaMs')),
    reglasMs: Math.round(pick('reglasMs')),
    totalMs: Math.round(pick('totalMs')),
    tramoMaxMs: Math.round(pick('tramoMaxMs') * 10) / 10,
    cesiones: Math.round(median(runs.map((r) => r.cesiones))),
  });
}
const out = { fecha: new Date().toISOString(), node: process.version, presupuestoMs: 8, filas: rows };
save('perf', out);
console.table(rows);
