// Estados faltantes: describe cómo deberían verse según las variantes existentes. Solo describe; no crea nada.
import type { DocNode, Finding, Scene } from '../shared/types';
import { BATCH_SIZE, chunk, type AiContext, type StageResult } from './batch';
import { hash } from './cache';
import { describeVariant } from './describe';
import { STATES_SCHEMA } from './schemas';
import { STATES_SYSTEM } from './prompts';
import { BudgetExceeded, structuredCall } from './structured';
import { validateStates, type StateNote } from './validate';

export interface StateJob {
  findingId: string;
  key: string;
  payload: Record<string, unknown>;
}

export function collectStateJobs(findings: Finding[], scene: Scene, ignored: ReadonlySet<string>): StateJob[] {
  const jobs: StateJob[] = [];
  for (const f of findings) {
    if (f.ruleId !== 'component-missing-states' || ignored.has(f.id) || !f.missing?.length) continue;
    const node = scene.nodes[f.nodeId];
    if (!node) continue;
    const variants = node.children
      .map((id) => scene.nodes[id])
      .filter((c): c is DocNode => !!c && c.type === 'COMPONENT')
      .slice(0, 10)
      .map((c) => describeVariant(c, scene));
    const payload = { nombre: node.name, propiedades: node.component?.variantOptions ?? {}, faltan: f.missing, variantes: variants };
    jobs.push({ findingId: f.id, key: hash(JSON.stringify(payload)), payload });
  }
  return jobs;
}

const format = (notes: StateNote['notes']) => notes.map((n) => `${n.state}: ${n.description}`).join('\n');

/** findingId → nota de la IA con cómo deberían verse los estados que faltan. */
export async function runStates(ctx: AiContext, jobs: StateJob[]): Promise<StageResult<Record<string, string>>> {
  const notes: Record<string, string> = {};
  const misses: StateJob[] = [];
  for (const j of jobs) {
    const cached = ctx.cache.get('state', j.key);
    if (cached) notes[j.findingId] = cached;
    else misses.push(j);
  }
  let truncated = false;
  let failed = 0;
  for (const batch of chunk(misses, BATCH_SIZE.states)) {
    if (ctx.signal.cancelled) break;
    const ids = new Map<string, StateJob>(batch.map((j, i) => [`S${i + 1}`, j]));
    try {
      const out = await structuredCall({
        client: ctx.client,
        budget: ctx.budget,
        request: {
          system: STATES_SYSTEM,
          user: JSON.stringify({ sets: batch.map((j, i) => ({ id: `S${i + 1}`, ...j.payload })) }),
          schema: STATES_SCHEMA,
          maxTokens: Math.min(4096, batch.length * 500 + 200),
        },
        validate: (raw) => validateStates(raw, new Set(ids.keys())),
      });
      if (out === null) failed += 1;
      else
        for (const n of out) {
          const job = ids.get(n.id)!;
          const text = format(n.notes);
          notes[job.findingId] = text;
          ctx.cache.set('state', job.key, text);
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
  return { value: notes, truncated, failed };
}
