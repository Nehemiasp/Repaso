// Resumen de la revisión en 2 o 3 frases, para el reporte exportado.
import { buildResult } from '../engine/run';
import type { Finding } from '../shared/types';
import { CATEGORY_LABEL, RULE_LABEL } from '../ui/i18n/es';
import type { AiContext } from './batch';
import { SUMMARY_SCHEMA } from './schemas';
import { SUMMARY_SYSTEM } from './prompts';
import { BudgetExceeded, structuredCall } from './structured';
import { validateSummary } from './validate';

export async function runSummary(ctx: AiContext, findings: Finding[], nodeCount: number): Promise<{ text?: string; truncated: boolean }> {
  if (ctx.signal.cancelled) return { truncated: false };
  const r = buildResult(findings, nodeCount, new Set());
  const data = {
    puntaje: r.score.score,
    capasRevisadas: nodeCount,
    totalHallazgos: r.findings.length,
    porSeveridad: r.bySeverity,
    porCategoria: Object.fromEntries(Object.entries(r.byCategory).filter(([, n]) => n > 0).map(([c, n]) => [CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL], n])),
    reglasQueMasRestan: r.score.breakdown.slice(0, 4).map((b) => ({ regla: RULE_LABEL[b.ruleId].name, hallazgos: b.count, puntos: b.penalty })),
    noVerificados: r.unverifiable,
  };
  try {
    const out = await structuredCall({
      client: ctx.client,
      budget: ctx.budget,
      request: { system: SUMMARY_SYSTEM, user: JSON.stringify(data), schema: SUMMARY_SCHEMA, maxTokens: 400 },
      validate: validateSummary,
    });
    return { ...(out ? { text: out } : {}), truncated: false };
  } catch (e) {
    if (e instanceof BudgetExceeded) return { truncated: true };
    throw e;
  } finally {
    ctx.tick();
  }
}
