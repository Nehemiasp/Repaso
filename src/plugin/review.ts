// Orquesta una revisión: lee → motor → resultado. No contiene reglas.
import { buildResult, orderedNodes, runRulesAsync } from '../engine';
import { MAX_NODES } from '../shared/constants';
import type { ErrorKind, LastSummary, ReviewPayload, Scope, ToUi } from '../shared/messages';
import type { Scene, Settings, StyleCatalog } from '../shared/types';
import { readCatalog } from '../read/catalog';
import { readScope, TooLargeError } from '../read/traverse';
import { getIgnored, setLast } from './storage';

export interface ReviewDeps {
  post: (m: ToUi) => void;
  settings: Settings;
}

export interface ReviewOutcome {
  /** null si se canceló o falló (ya se avisó a la interfaz). */
  payload: ReviewPayload | null;
  scene?: Scene;
  catalog?: StyleCatalog;
}

const fail = (post: (m: ToUi) => void, kind: ErrorKind, detail?: string, count?: number): ReviewOutcome => {
  post({ type: 'error', kind, ...(detail ? { detail } : {}), ...(count ? { count } : {}) });
  return { payload: null };
};

export async function runReview(scope: Scope, deps: ReviewDeps, signal: { cancelled: boolean }): Promise<ReviewOutcome> {
  const { post, settings } = deps;
  const started = Date.now();
  const roots: readonly SceneNode[] = scope === 'selection' ? figma.currentPage.selection : figma.currentPage.children;
  if (roots.length === 0) return fail(post, scope === 'selection' ? 'no-selection' : 'empty-selection');

  try {
    post({ type: 'progress', phase: 'reading', done: 0, total: 0 });
    const scene = await readScope({
      env: { mixed: figma.mixed },
      roots,
      skipHidden: settings.ignoreHidden,
      maxNodes: MAX_NODES,
      signal,
      onProgress: (done) => post({ type: 'progress', phase: 'reading', done, total: 0 }),
    });
    if (!scene) {
      post({ type: 'cancelled' });
      return { payload: null };
    }
    const catalog = await readCatalog();
    const total = orderedNodes(scene).length;
    if (settings.ignoreHidden && !orderedNodes(scene).some((n) => n.visible)) return fail(post, 'empty-selection');

    const result = await runRulesAsync(scene, catalog, settings, {
      signal,
      onProgress: (done) => post({ type: 'progress', phase: 'checking', done, total }),
    });
    if (!result) {
      post({ type: 'cancelled' });
      return { payload: null };
    }

    const ignoredIds = getIgnored();
    const meta = { scope, nodeCount: result.nodeCount, durationMs: Date.now() - started, at: Date.now() };
    const payload: ReviewPayload = { findings: result.findings, ignoredIds, meta };

    const shown = buildResult(result.findings, result.nodeCount, new Set(ignoredIds));
    const last: LastSummary = {
      score: shown.score.score,
      total: shown.findings.length,
      critical: shown.bySeverity.critical,
      high: shown.bySeverity.high,
      medium: shown.bySeverity.medium,
      low: shown.bySeverity.low,
      scope,
      nodeCount: result.nodeCount,
      at: meta.at,
    };
    setLast(last);
    post({ type: 'result', payload });
    return { payload, scene, catalog };
  } catch (e) {
    if (e instanceof TooLargeError) return fail(post, 'too-large', e.message, e.count);
    return fail(post, 'unknown', e instanceof Error ? e.message : String(e));
  }
}
