// Textos: ortografía, mayúsculas inconsistentes en botones y mezcla de «tú»/«usted».
import { clip } from '../engine/format';
import type { AiRuleId, DocNode, Finding, Scene, Tone } from '../shared/types';
import { BATCH_SIZE, chunk, type AiContext, type StageResult } from './batch';
import { hash } from './cache';
import { isButtonLabel } from './describe';
import { COPY_SCHEMA } from './schemas';
import { copySystem } from './prompts';
import { BudgetExceeded, structuredCall } from './structured';
import { validateCopy, type CopyIssue, type CopyKind } from './validate';

export interface CopyJob {
  /** Texto único (varias capas pueden compartirlo). */
  text: string;
  isButton: boolean;
  key: string;
  nodeIds: string[];
}

const MAX_TEXT = 200;
const HAS_LETTERS = /\p{L}/u;

export function collectCopyJobs(scene: Scene, tone: Tone, ignored: ReadonlySet<string>): CopyJob[] {
  const groups = new Map<string, { text: string; isButton: boolean; nodeIds: string[] }>();
  const texts: { node: DocNode; text: string; isButton: boolean }[] = [];
  const buttonLabels = new Set<string>();
  const walk = (id: string, seen: Set<string>) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = scene.nodes[id];
    if (!n) return;
    if (n.visible && n.type === 'TEXT' && n.text) {
      const text = n.text.characters.trim();
      if (text.length >= 2 && text.length <= MAX_TEXT && HAS_LETTERS.test(text)) {
        const isButton = isButtonLabel(n, scene);
        texts.push({ node: n, text, isButton });
        if (isButton) buttonLabels.add(text);
      }
    }
    for (const c of n.children) walk(c, seen);
  };
  const seen = new Set<string>();
  for (const r of scene.rootIds) walk(r, seen);

  for (const t of texts) {
    // Si el usuario ya ignoró los tres posibles hallazgos de esta capa, no se vuelve a gastar en ella.
    if ((['ai-spelling', 'ai-case', 'ai-tone'] as AiRuleId[]).every((r) => ignored.has(`${r}:${t.node.id}`))) continue;
    const k = `${t.isButton ? 'b' : 't'}|${t.text}`;
    const g = groups.get(k) ?? { text: t.text, isButton: t.isButton, nodeIds: [] };
    g.nodeIds.push(t.node.id);
    groups.set(k, g);
  }
  // La consistencia de mayúsculas depende de TODOS los botones: entra en la clave de los botones.
  const digest = hash([...buttonLabels].sort().join('\u0001'));
  return [...groups.values()].map((g) => ({ ...g, key: hash(`${tone}|${g.isButton ? digest : '-'}|${g.isButton}|${g.text}`) }));
}

const LABEL: Record<CopyKind, string> = { spelling: 'Ortografía', case: 'Mayúsculas', tone: 'Trato' };
const SEVERITY: Record<CopyKind, Finding['severity']> = { spelling: 'medium', case: 'low', tone: 'low' };

const encode = (i: CopyIssue | null) => (i ? JSON.stringify([i.kind, i.suggested, i.reason]) : '');
const decode = (id: string, raw: string): CopyIssue | null => {
  if (!raw) return null;
  try {
    const [kind, suggested, reason] = JSON.parse(raw) as [CopyKind, string, string];
    return { id, kind, suggested, reason };
  } catch {
    return null;
  }
};

export function toFindings(job: CopyJob, issue: CopyIssue, scene: Scene): Finding[] {
  const ruleId = `ai-${issue.kind}` as AiRuleId;
  return job.nodeIds.flatMap((nodeId) => {
    const node = scene.nodes[nodeId];
    if (!node) return [];
    return [
      {
        id: `${ruleId}:${nodeId}`,
        ruleId,
        category: 'texts' as const,
        severity: SEVERITY[issue.kind],
        nodeId,
        nodeName: node.name,
        nodeType: node.type,
        message: `${LABEL[issue.kind]}: «${clip(job.text, 40)}» → «${clip(issue.suggested, 40)}»`,
        ...(issue.reason ? { detail: issue.reason } : {}),
        status: 'fail' as const,
      },
    ];
  });
}

/** Hallazgos de texto de la IA. Cada uno apunta a una capa concreta. */
export async function runCopy(ctx: AiContext, jobs: CopyJob[], scene: Scene, tone: Tone): Promise<StageResult<Finding[]>> {
  const findings: Finding[] = [];
  const misses: CopyJob[] = [];
  for (const j of jobs) {
    const cached = ctx.cache.get('copy', j.key);
    if (cached === undefined) misses.push(j);
    else {
      const issue = decode('', cached);
      if (issue) findings.push(...toFindings(j, issue, scene));
    }
  }
  // Los botones van juntos y primero: así el modelo ve todas las etiquetas a la vez.
  misses.sort((a, b) => Number(b.isButton) - Number(a.isButton));
  let truncated = false;
  let failed = 0;
  for (const batch of chunk(misses, BATCH_SIZE.copy)) {
    if (ctx.signal.cancelled) break;
    const ids = new Map<string, CopyJob>(batch.map((j, i) => [`T${i + 1}`, j]));
    try {
      const out = await structuredCall({
        client: ctx.client,
        budget: ctx.budget,
        request: {
          system: copySystem(tone),
          user: JSON.stringify({ trato: tone, textos: batch.map((j, i) => ({ id: `T${i + 1}`, texto: j.text, isButton: j.isButton })) }),
          schema: COPY_SCHEMA,
          maxTokens: Math.min(4096, batch.length * 60 + 200),
        },
        validate: (raw) =>
          validateCopy(raw, new Map(batch.map((j, i) => [`T${i + 1}`, j.text] as const))),
      });
      if (out === null) failed += 1;
      else {
        const byId = new Map(out.map((i) => [i.id, i] as const));
        for (const [id, job] of ids) {
          const issue = byId.get(id) ?? null;
          ctx.cache.set('copy', job.key, encode(issue));
          if (issue) findings.push(...toFindings(job, issue, scene));
        }
      }
    } catch (e) {
      if (e instanceof BudgetExceeded) {
        truncated = true;
        break;
      }
      throw e;
    } finally {
      ctx.tick();
    }
  }
  return { value: findings, truncated, failed };
}
