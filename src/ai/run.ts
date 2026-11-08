// Orquesta la parte con IA de una revisión. Las reglas de la fase 1 ya corrieron y NO se tocan:
// la IA solo agrega nombres, notas sobre estados, hallazgos de texto y el resumen.
import { formatUsd } from './pricing';
import type { Finding, Scene, Settings } from '../shared/types';
import { Budget } from './budget';
import type { AiCache } from './cache';
import type { AiClient } from './client';
import type { AiContext } from './batch';
import { BATCH_SIZE } from './batch';
import { collectCopyJobs, runCopy } from './copy';
import { collectNameJobs, runNames } from './names';
import { collectStateJobs, runStates } from './states';
import { runSummary } from './summary';

export interface AiPassInput {
  scene: Scene;
  /** Hallazgos de las reglas (sin IA). */
  findings: Finding[];
  ignored: ReadonlySet<string>;
  settings: Settings;
  client: AiClient;
  cache: AiCache;
  signal: { cancelled: boolean };
  onProgress?: (done: number, total: number) => void;
}

export interface AiPassOutput {
  /** findingId → nombre de capa propuesto. */
  aiNames: Record<string, string>;
  /** Hallazgos existentes con nota de la IA (id → nota). */
  notes: Record<string, string>;
  /** Hallazgos de texto nuevos (ortografía, mayúsculas, trato). */
  extra: Finding[];
  summary?: string;
  /** Aviso no fatal para mostrar en Resultados. */
  notice?: string;
  calls: number;
  spentUsd: number;
}

const batches = (n: number, size: number) => Math.ceil(n / size);

export async function runAiPass(input: AiPassInput): Promise<AiPassOutput> {
  const { scene, findings, ignored, settings, cache, signal } = input;
  const budget = new Budget(settings.aiBudgetUsd, settings.model);
  let done = 0;
  let total = 1;
  const ctx: AiContext = {
    client: input.client,
    budget,
    cache,
    signal,
    tick: () => input.onProgress?.(Math.min(++done, total), total),
  };

  const nameJobs = collectNameJobs(findings, scene, ignored);
  const stateJobs = collectStateJobs(findings, scene, ignored);
  const copyJobs = collectCopyJobs(scene, settings.tone, ignored);
  // Estimado de lotes para la barra de progreso (los que ya están en caché no cuentan).
  const missing = (ns: string, keys: string[]) => keys.filter((k) => cache.get(ns, k) === undefined).length;
  total =
    batches(missing('name', nameJobs.map((j) => j.key)), BATCH_SIZE.names) +
    batches(missing('state', stateJobs.map((j) => j.key)), BATCH_SIZE.states) +
    batches(missing('copy', copyJobs.map((j) => j.key)), BATCH_SIZE.copy) +
    1;
  input.onProgress?.(0, total);

  const names = await runNames(ctx, nameJobs);
  const states = await runStates(ctx, stateJobs);
  const copy = await runCopy(ctx, copyJobs, scene, settings.tone);

  // Los hallazgos de texto ya ignorados por el usuario no vuelven a aparecer.
  const extra = copy.value.filter((f) => !ignored.has(f.id));
  const summary = await runSummary(ctx, [...findings, ...extra].filter((f) => !ignored.has(f.id)), Object.keys(scene.nodes).length);

  const parts: string[] = [];
  if (names.truncated || states.truncated || copy.truncated || summary.truncated) {
    parts.push(`La IA revisó solo una parte porque se alcanzó el tope de ${formatUsd(settings.aiBudgetUsd)} por revisión. Suba el tope en Ajustes o revise por partes.`);
  }
  const failed = names.failed + states.failed + copy.failed;
  if (failed > 0) parts.push(`${failed} ${failed === 1 ? 'lote de la IA se descartó' : 'lotes de la IA se descartaron'} por respuestas no válidas; el resto sí se aplicó.`);

  return {
    aiNames: names.value,
    notes: states.value,
    extra,
    ...(summary.text ? { summary: summary.text } : {}),
    ...(parts.length ? { notice: parts.join(' ') } : {}),
    calls: budget.calls,
    spentUsd: budget.spent,
  };
}
