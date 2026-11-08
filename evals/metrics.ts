// Métricas de la evaluación. Funciones puras, con pruebas en tests/evals.test.ts.
import type { Finding } from '../src/shared/types';

export interface ExpectedIssue {
  nodeId: string;
  kind: 'spelling' | 'case' | 'tone';
  suggested: string;
}

export interface CopyMetrics {
  expected: number;
  detected: number;
  /** Detectados con el tipo correcto. */
  detectedRightKind: number;
  /** Detectados y con la corrección esperada (ignorando mayúsculas/espacios). */
  detectedRightFix: number;
  falseAlarms: number;
  /** Hallazgos totales de la IA. */
  reported: number;
  recall: number;
  precision: number;
  missed: string[];
  falseAlarmIds: string[];
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Compara los hallazgos de texto de la IA con los errores que se insertaron a propósito. */
export function scoreCopy(expected: ExpectedIssue[], findings: Finding[]): CopyMetrics {
  const ai = findings.filter((f) => f.ruleId.startsWith('ai-'));
  const byNode = new Map(ai.map((f) => [f.nodeId, f] as const));
  let detected = 0;
  let rightKind = 0;
  let rightFix = 0;
  const missed: string[] = [];
  for (const e of expected) {
    const f = byNode.get(e.nodeId);
    if (!f) {
      missed.push(e.nodeId);
      continue;
    }
    detected += 1;
    if (f.ruleId === `ai-${e.kind}`) rightKind += 1;
    if (norm(f.message).includes(`→ «${norm(e.suggested)}`) || norm(f.message).endsWith(`«${norm(e.suggested)}»`)) rightFix += 1;
  }
  const expectedIds = new Set(expected.map((e) => e.nodeId));
  const falseAlarmIds = ai.filter((f) => !expectedIds.has(f.nodeId)).map((f) => f.id);
  const tp = detected;
  return {
    expected: expected.length,
    detected,
    detectedRightKind: rightKind,
    detectedRightFix: rightFix,
    falseAlarms: falseAlarmIds.length,
    reported: ai.length,
    recall: expected.length ? tp / expected.length : 1,
    precision: ai.length ? tp / ai.length : 1,
    missed,
    falseAlarmIds,
  };
}

export interface NamesScore {
  rated: number;
  pending: number;
  bad: number;
  acceptable: number;
  good: number;
  /** % de nombres aceptables o buenos entre los calificados. */
  acceptableOrGoodPct: number;
  goodPct: number;
  average: number;
}

/** Lee la tabla Markdown de nombres con la columna de calificación (1 malo, 2 aceptable, 3 bueno). */
export function scoreNamesTable(markdown: string): NamesScore {
  const ratings: (number | null)[] = [];
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|') || /^\|[\s:-]+\|/.test(line) || /Calif/i.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const last = cells[cells.length - 1] ?? '';
    ratings.push(/^[123]$/.test(last) ? Number(last) : null);
  }
  const rated = ratings.filter((r): r is number => r !== null);
  const count = (n: number) => rated.filter((r) => r === n).length;
  const pct = (n: number) => (rated.length ? (n / rated.length) * 100 : 0);
  return {
    rated: rated.length,
    pending: ratings.length - rated.length,
    bad: count(1),
    acceptable: count(2),
    good: count(3),
    acceptableOrGoodPct: pct(count(2) + count(3)),
    goodPct: pct(count(3)),
    average: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0,
  };
}
