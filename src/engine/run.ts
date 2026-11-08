import type { DocNode, Finding, Scene, Settings, StyleCatalog } from '../shared/types';
import { RULES } from './registry';
import type { RuleContext } from './rules/types';
import { computeScore, countByCategory, countBySeverity, type ScoreResult } from './score';
import type { Category, Severity } from '../shared/types';

export interface ReviewResult {
  findings: Finding[];
  score: ScoreResult;
  bySeverity: Record<Severity, number>;
  byCategory: Record<Category, number>;
  /** Capas revisadas. */
  nodeCount: number;
  /** Hallazgos que no se pudieron comprobar. */
  unverifiable: number;
  /** Hallazgos descartados por el usuario («Ignorar»). */
  ignored: number;
}

/** Nodos del alcance en orden de recorrido (profundidad primero). Tolera hijos ausentes. */
export function orderedNodes(scene: Scene): DocNode[] {
  const out: DocNode[] = [];
  const stack = [...scene.rootIds].reverse();
  while (stack.length) {
    const node = scene.nodes[stack.pop()!];
    if (!node) continue;
    out.push(node);
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]!);
  }
  return out;
}

function checkNode(node: DocNode, ctx: RuleContext): Finding[] {
  if (ctx.settings.ignoreHidden && !node.visible) return [];
  const out: Finding[] = [];
  for (const rule of RULES) {
    if (ctx.settings.rules[rule.id] === false) continue;
    out.push(...rule.checkNode(node, ctx));
  }
  return out;
}

function finish(all: Finding[], nodeCount: number, ignored: ReadonlySet<string>): ReviewResult {
  const findings = all.filter((f) => !ignored.has(f.id));
  return {
    findings,
    score: computeScore(findings),
    bySeverity: countBySeverity(findings),
    byCategory: countByCategory(findings),
    nodeCount,
    unverifiable: findings.filter((f) => f.status === 'unverifiable').length,
    ignored: all.length - findings.length,
  };
}

/** Versión síncrona: para pruebas, scripts y archivos pequeños. */
export function runRules(
  scene: Scene,
  catalog: StyleCatalog,
  settings: Settings,
  ignored: ReadonlySet<string> = new Set(),
): ReviewResult {
  const ctx: RuleContext = { scene, catalog, settings };
  const nodes = orderedNodes(scene);
  const all: Finding[] = [];
  for (const node of nodes) all.push(...checkNode(node, ctx));
  return finish(all, nodes.length, ignored);
}

export interface AsyncRunOptions {
  ignored?: ReadonlySet<string>;
  /** Milisegundos de trabajo antes de ceder el hilo. */
  budgetMs?: number;
  now?: () => number;
  yieldFn?: () => Promise<void>;
  onProgress?: (done: number, total: number) => void;
  signal?: { cancelled: boolean };
}

/** Versión por trozos: cede el hilo cada `budgetMs` para no congelar Figma. Devuelve null si se cancela. */
export async function runRulesAsync(
  scene: Scene,
  catalog: StyleCatalog,
  settings: Settings,
  opts: AsyncRunOptions = {},
): Promise<ReviewResult | null> {
  const { budgetMs = 8, now = () => Date.now(), yieldFn = () => new Promise<void>((r) => setTimeout(r, 0)) } = opts;
  const ctx: RuleContext = { scene, catalog, settings };
  const nodes = orderedNodes(scene);
  const all: Finding[] = [];
  let sliceStart = now();
  for (let i = 0; i < nodes.length; i++) {
    all.push(...checkNode(nodes[i]!, ctx));
    if (now() - sliceStart >= budgetMs) {
      opts.onProgress?.(i + 1, nodes.length);
      await yieldFn();
      if (opts.signal?.cancelled) return null;
      sliceStart = now();
    }
  }
  opts.onProgress?.(nodes.length, nodes.length);
  if (opts.signal?.cancelled) return null;
  return finish(all, nodes.length, opts.ignored ?? new Set());
}
