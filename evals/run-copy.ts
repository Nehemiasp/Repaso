// Evaluación de la revisión de textos con IA: errores insertados a propósito (fixtures/textos-con-errores.json).
// Mide cuántos detecta (recall), cuántos acierta de tipo y de corrección, y cuántas falsas alarmas da.
//
//   npm run eval:copy -- --dry
//   ANTHROPIC_API_KEY=sk-ant-… npm run eval:copy [-- --runs 3]
import { readFileSync } from 'node:fs';
import { Budget } from '../src/ai/budget';
import { AiCache } from '../src/ai/cache';
import { collectCopyJobs, runCopy } from '../src/ai/copy';
import { estimateAi } from '../src/ai/estimate';
import { formatUsd } from '../src/ai/pricing';
import { DEFAULT_MODEL } from '../src/shared/constants';
import type { Scene, StyleCatalog, Tone } from '../src/shared/types';
import { settings } from '../tests/builders';
import { scoreCopy, type ExpectedIssue } from './metrics';
import { arg, flag, realClient, save } from './util';

interface File { catalog: StyleCatalog; scene: Scene; tone: Tone; expected: ExpectedIssue[] }
const fx: File = JSON.parse(readFileSync('fixtures/textos-con-errores.json', 'utf8'));
const model = arg('model', DEFAULT_MODEL)!;
const runs = Number(arg('runs', '1'));
const cfg = settings({ aiEnabled: true, model, tone: fx.tone, aiBudgetUsd: 5 });

const jobs = collectCopyJobs(fx.scene, fx.tone, new Set());
const est = estimateAi(fx.scene, [], new Set(), cfg);
console.log(`${jobs.length} textos únicos · ${fx.expected.length} errores insertados · ~${formatUsd(est.costUsd)} por corrida (${model})`);
if (flag('dry')) process.exit(0);

const results = [];
let spent = 0;
for (let i = 0; i < runs; i++) {
  const budget = new Budget(5, model);
  const res = await runCopy({ client: realClient(model), budget, cache: new AiCache(), signal: { cancelled: false }, tick: () => {} }, jobs, fx.scene, fx.tone);
  spent += budget.spent;
  const m = scoreCopy(fx.expected, res.value);
  results.push(m);
  console.log(`Corrida ${i + 1}: detectó ${m.detected}/${m.expected} (tipo correcto ${m.detectedRightKind}, corrección esperada ${m.detectedRightFix}) · falsas alarmas ${m.falseAlarms} · precisión ${(m.precision * 100).toFixed(0)} %`);
  if (m.missed.length) console.log('  No detectó:', m.missed.join(', '));
  if (m.falseAlarmIds.length) console.log('  Falsas alarmas:', m.falseAlarmIds.join(', '));
}
save('copy-ai', { fecha: new Date().toISOString(), modelo: model, tono: fx.tone, corridas: results, gastoUsd: spent });
