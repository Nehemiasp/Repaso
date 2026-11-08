// Estimado de costo ANTES de gastar: se muestra en archivos grandes para que la persona decida.
import type { AiEstimate } from '../shared/messages';
import type { Finding, Scene, Settings } from '../shared/types';
import { BATCH_SIZE } from './batch';
import type { AiCache } from './cache';
import { collectCopyJobs } from './copy';
import { collectNameJobs } from './names';
import { collectStateJobs } from './states';
import { copySystem, NAMES_SYSTEM, STATES_SYSTEM, SUMMARY_SYSTEM } from './prompts';
import { costOf, estimateTokens } from './pricing';

/** A partir de cuántas capas o de cuánto costo se pide confirmación antes de usar la IA. */
export const CONFIRM_LAYERS = 120;
export const CONFIRM_COST_USD = 0.02;

const OUT = { name: 18, state: 140, copy: 6, summary: 130 } as const;

export function estimateAi(scene: Scene, findings: Finding[], ignored: ReadonlySet<string>, settings: Settings, cache?: AiCache): AiEstimate {
  const miss = (ns: string, key: string) => !cache || cache.get(ns, key) === undefined;
  const names = collectNameJobs(findings, scene, ignored).filter((j) => miss('name', j.key));
  const states = collectStateJobs(findings, scene, ignored).filter((j) => miss('state', j.key));
  const copy = collectCopyJobs(scene, settings.tone, ignored).filter((j) => miss('copy', j.key));

  const calls = Math.ceil(names.length / BATCH_SIZE.names) + Math.ceil(states.length / BATCH_SIZE.states) + Math.ceil(copy.length / BATCH_SIZE.copy) + 1;
  const sys = (names.length ? Math.ceil(names.length / BATCH_SIZE.names) * estimateTokens(NAMES_SYSTEM) : 0) +
    (states.length ? Math.ceil(states.length / BATCH_SIZE.states) * estimateTokens(STATES_SYSTEM) : 0) +
    (copy.length ? Math.ceil(copy.length / BATCH_SIZE.copy) * estimateTokens(copySystem(settings.tone)) : 0) +
    estimateTokens(SUMMARY_SYSTEM);
  const inputTokens =
    sys +
    names.reduce((n, j) => n + estimateTokens(JSON.stringify(j.desc)), 0) +
    states.reduce((n, j) => n + estimateTokens(JSON.stringify(j.payload)), 0) +
    copy.reduce((n, j) => n + estimateTokens(j.text) + 12, 0) +
    300;
  const outputTokens = names.length * OUT.name + states.length * OUT.state + copy.length * OUT.copy + OUT.summary;
  const costUsd = costOf(settings.model, inputTokens, outputTokens);
  return {
    layers: names.length,
    texts: copy.length,
    sets: states.length,
    calls,
    inputTokens,
    outputTokens,
    costUsd,
    budgetUsd: settings.aiBudgetUsd,
    overBudget: costUsd > settings.aiBudgetUsd,
    model: settings.model,
  };
}

export const needsConfirmation = (e: AiEstimate): boolean => e.layers + e.texts + e.sets > CONFIRM_LAYERS || e.costUsd > CONFIRM_COST_USD;
