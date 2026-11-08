import { RULE_PENALTY_CAP, SEVERITY_WEIGHT } from '../shared/constants';
import { CATEGORIES, SEVERITIES, type AiRuleId, type Category, type Finding, type RuleId, type Severity } from '../shared/types';

export interface ScoreBreakdownItem {
  ruleId: RuleId | AiRuleId;
  count: number;
  /** Puntos que resta esta regla (ya con tope). */
  penalty: number;
  /** Se alcanzó el tope de la regla. */
  capped: boolean;
}

export interface ScoreResult {
  /** 0..100 */
  score: number;
  penalty: number;
  breakdown: ScoreBreakdownItem[];
}

/**
 * Puntaje explicable: 100 menos lo que resta cada hallazgo según su severidad
 * (crítica 10, alta 5, media 2, baja 1), con un tope de 25 por regla para que
 * un solo tipo de problema repetido no hunda todo el puntaje.
 */
export function computeScore(findings: Finding[]): ScoreResult {
  const raw = new Map<RuleId | AiRuleId, { count: number; sum: number }>();
  for (const f of findings) {
    const cur = raw.get(f.ruleId) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += SEVERITY_WEIGHT[f.severity];
    raw.set(f.ruleId, cur);
  }
  const breakdown: ScoreBreakdownItem[] = [...raw.entries()]
    .map(([ruleId, { count, sum }]) => ({
      ruleId,
      count,
      penalty: Math.min(sum, RULE_PENALTY_CAP),
      capped: sum > RULE_PENALTY_CAP,
    }))
    .sort((a, b) => b.penalty - a.penalty);
  const penalty = breakdown.reduce((n, b) => n + b.penalty, 0);
  return { score: Math.max(0, Math.round(100 - penalty)), penalty, breakdown };
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const out = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<Severity, number>;
  for (const f of findings) out[f.severity] += 1;
  return out;
}

export function countByCategory(findings: Finding[]): Record<Category, number> {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const f of findings) out[f.category] += 1;
  return out;
}
