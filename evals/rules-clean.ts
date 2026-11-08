// Evaluación de las reglas SIN IA: el archivo limpio no debe tener hallazgos y el de prueba debe dar los esperados.
import { readFileSync } from 'node:fs';
import { runRules } from '../src/engine';
import type { Scene, StyleCatalog } from '../src/shared/types';
import { settings } from '../tests/builders';
import { save } from './util';

const fx = <T>(f: string): T => JSON.parse(readFileSync(`fixtures/${f}`, 'utf8')) as T;
interface File { catalog: StyleCatalog; scene: Scene; expectedFindings?: string[] }

const clean = fx<File>('archivo-limpio.json');
const rClean = runRules(clean.scene, clean.catalog, settings());

const test = fx<File>('archivo-prueba.json');
const rTest = runRules(test.scene, test.catalog, settings());
const expected = new Set(test.expectedFindings);
const found = new Set(rTest.findings.map((f) => f.id));

const copy = fx<File>('textos-con-errores.json');
const rCopy = runRules(copy.scene, copy.catalog, settings());

const out = {
  fecha: new Date().toISOString(),
  limpio: { capas: rClean.nodeCount, hallazgos: rClean.findings.length, puntaje: rClean.score.score, ids: rClean.findings.map((f) => f.id) },
  prueba: {
    capas: rTest.nodeCount,
    esperados: expected.size,
    detectados: [...expected].filter((id) => found.has(id)).length,
    sobrantes: [...found].filter((id) => !expected.has(id)),
    noVerificables: rTest.unverifiable,
    puntaje: rTest.score.score,
    reglasCubiertas: [...new Set(rTest.findings.map((f) => f.ruleId))].length,
  },
  textos: { capas: rCopy.nodeCount, hallazgosDeReglas: rCopy.findings.length },
};
save('rules', out);
console.log(JSON.stringify(out, null, 2));
process.exit(out.limpio.hallazgos === 0 && out.prueba.detectados === out.prueba.esperados && out.prueba.sobrantes.length === 0 ? 0 : 1);
