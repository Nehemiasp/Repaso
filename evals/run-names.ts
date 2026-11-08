// Evaluación de nombres de capa con IA (3 archivos de prueba).
//
//   npm run eval:names -- --dry                 estimado de costo, sin llamar a la API
//   ANTHROPIC_API_KEY=sk-ant-… npm run eval:names   genera los nombres y escribe evals/names-tabla.md
//   npm run eval:names -- --score evals/names-tabla.md   calcula el % de nombres aceptables o buenos
import { readFileSync, writeFileSync } from 'node:fs';
import { Budget } from '../src/ai/budget';
import { AiCache } from '../src/ai/cache';
import { describeLayer } from '../src/ai/describe';
import { estimateAi } from '../src/ai/estimate';
import { collectNameJobs, runNames } from '../src/ai/names';
import { formatUsd } from '../src/ai/pricing';
import { runRules } from '../src/engine';
import { DEFAULT_MODEL } from '../src/shared/constants';
import { catalog, settings } from '../tests/builders';
import { scoreNamesTable } from './metrics';
import { EVAL_FILES } from './scenes';
import { arg, flag, realClient, save } from './util';

const model = arg('model', DEFAULT_MODEL)!;
const cfg = settings({ aiEnabled: true, model, aiBudgetUsd: 5 });

if (arg('score')) {
  const s = scoreNamesTable(readFileSync(arg('score')!, 'utf8'));
  save('names-score', { fecha: new Date().toISOString(), ...s });
  console.log(`Calificados: ${s.rated} (pendientes: ${s.pending})\nMalos ${s.bad} · Aceptables ${s.acceptable} · Buenos ${s.good}\n→ Aceptables o buenos: ${s.acceptableOrGoodPct.toFixed(0)} %  ·  Buenos: ${s.goodPct.toFixed(0)} %  ·  Promedio ${s.average.toFixed(2)}`);
  process.exit(0);
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const structure = (d: ReturnType<typeof describeLayer>) => `${d.type} ${d.size}${d.layout ? ` ${d.layout}` : ''}${d.children.length ? ` · ${d.children.join(', ')}` : ''}`;

const rows: string[] = [];
const summary: Record<string, unknown>[] = [];
let totalSpent = 0;
let n = 0;

for (const f of EVAL_FILES) {
  const sc = f.scene();
  const findings = runRules(sc, catalog(), settings()).findings;
  const jobs = collectNameJobs(findings, sc, new Set());
  const est = estimateAi(sc, findings, new Set(), cfg);
  console.log(`${f.titulo}: ${jobs.length} capas sin nombre · ~${formatUsd(est.costUsd)} (${model})`);
  if (flag('dry')) continue;

  const budget = new Budget(5, model);
  const res = await runNames({ client: realClient(model), budget, cache: new AiCache(), signal: { cancelled: false }, tick: () => {} }, jobs);
  totalSpent += budget.spent;
  const byType = (await import('../src/engine/naming')).suggestNameByType;
  for (const j of jobs) {
    const node = sc.nodes[findings.find((x) => x.id === j.findingId)!.nodeId]!;
    rows.push(`| ${++n} | ${cell(f.titulo)} | ${cell(node.name)} | ${cell(structure(j.desc))} | ${cell(byType(node, sc))} | ${cell(res.value[j.findingId] ?? '— (descartado)')} |  |`);
  }
  summary.push({ archivo: f.id, capas: jobs.length, nombrados: Object.keys(res.value).length, lotesDescartados: res.failed, gastoUsd: budget.spent });
}

if (!flag('dry')) {
  const md = `# Nombres de capa · tabla para calificar

Modelo: \`${model}\` · ${new Date().toISOString().slice(0, 10)}

Califique la última columna con **1 = malo**, **2 = aceptable**, **3 = bueno**. Criterio: ¿un colega entendería la capa solo por el nombre y respeta «Categoría / Subtipo / Elemento»?
Luego: \`npm run eval:names -- --score evals/names-tabla.md\`.

| # | Archivo | Capa actual | Estructura | Por tipo (sin IA) | Propuesta de la IA | Calif. (1-3) |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
  writeFileSync('evals/names-tabla.md', md);
  save('names-ai', { fecha: new Date().toISOString(), modelo: model, archivos: summary, gastoUsd: totalSpent, capas: n });
  console.log(`\nTabla escrita en evals/names-tabla.md (${n} capas). Gasto: ${formatUsd(totalSpent)}.`);
}
