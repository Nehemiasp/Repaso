// Nombres de capas: la IA propone nombres con sentido siguiendo una convención. Solo para capas
// que la regla «capas sin nombre» ya marcó.
import { clip } from '../engine/format';
import type { Finding, Scene } from '../shared/types';
import { BATCH_SIZE, chunk, type AiContext, type StageResult } from './batch';
import { hash } from './cache';
import { describeLayer, type LayerDescription } from './describe';
import { NAMES_SCHEMA } from './schemas';
import { NAMES_SYSTEM } from './prompts';
import { BudgetExceeded, structuredCall } from './structured';
import { validateNames } from './validate';

export interface NameJob {
  findingId: string;
  key: string;
  desc: LayerDescription;
}

export function collectNameJobs(findings: Finding[], scene: Scene, ignored: ReadonlySet<string>): NameJob[] {
  const jobs: NameJob[] = [];
  for (const f of findings) {
    if (f.ruleId !== 'layer-default-name' || ignored.has(f.id)) continue;
    const node = scene.nodes[f.nodeId];
    if (!node) continue;
    const desc = describeLayer(node, scene);
    jobs.push({ findingId: f.id, key: hash(JSON.stringify(desc)), desc });
  }
  return jobs;
}

/** findingId → nombre propuesto. */
export async function runNames(ctx: AiContext, jobs: NameJob[]): Promise<StageResult<Record<string, string>>> {
  const names: Record<string, string> = {};
  const misses: NameJob[] = [];
  for (const j of jobs) {
    const cached = ctx.cache.get('name', j.key);
    if (cached) names[j.findingId] = cached;
    else misses.push(j);
  }
  let truncated = false;
  let failed = 0;
  for (const batch of chunk(misses, BATCH_SIZE.names)) {
    if (ctx.signal.cancelled) break;
    const ids = new Map<string, NameJob>(batch.map((j, i) => [`L${i + 1}`, j]));
    try {
      const out = await structuredCall({
        client: ctx.client,
        budget: ctx.budget,
        request: {
          system: NAMES_SYSTEM,
          user: JSON.stringify({ layers: batch.map((j, i) => ({ id: `L${i + 1}`, ...j.desc, name: clip(j.desc.name, 40) })) }),
          schema: NAMES_SCHEMA,
          maxTokens: Math.min(4096, batch.length * 40 + 200),
        },
        validate: (raw) => validateNames(raw, new Set(ids.keys())),
      });
      if (out === null) failed += 1;
      else
        for (const n of out) {
          const job = ids.get(n.id)!;
          names[job.findingId] = n.name;
          ctx.cache.set('name', job.key, n.name);
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
  return { value: names, truncated, failed };
}
