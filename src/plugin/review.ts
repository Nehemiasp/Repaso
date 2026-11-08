// Orquesta una revisión: lee → motor → resultado. No contiene reglas.
import { buildResult, orderedNodes, runRulesAsync } from '../engine';
import { AiCache, AiError, createClient, estimateAi, needsConfirmation, runAiPass, type FetchLike } from '../ai';
import { MAX_NODES } from '../shared/constants';
import type { AiEstimate, ErrorKind, LastSummary, ReviewPayload, Scope, ToUi } from '../shared/messages';
import type { Finding, Scene, Settings, StyleCatalog } from '../shared/types';
import { readCatalog } from '../read/catalog';
import { readScope, TooLargeError } from '../read/traverse';
import { getAiCache, getIgnored, loadKey, setAiCache, setLast } from './storage';

export interface ReviewDeps {
  post: (m: ToUi) => void;
  settings: Settings;
  /** Solo esta revisión: sin IA. */
  noAi?: boolean;
  /** Pide confirmación a la persona cuando la IA sale cara o la revisión es grande. */
  confirmAi: (estimate: AiEstimate) => Promise<boolean>;
}

export interface ReviewOutcome {
  /** null si se canceló o falló (ya se avisó a la interfaz). */
  payload: ReviewPayload | null;
  scene?: Scene;
  catalog?: StyleCatalog;
  aiNames?: Record<string, string>;
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
    const ignored = new Set(ignoredIds);
    let findings: Finding[] = result.findings;
    let aiNames: Record<string, string> = {};
    let aiSummary: string | undefined;
    let aiNotice: string | undefined;

    if ((typeof __AI__ === 'undefined' || __AI__) && settings.aiEnabled && !deps.noAi) {
      const key = await loadKey();
      if (!key) {
        aiNotice = 'La IA está activada pero no hay una clave guardada, así que se revisó sin IA. Péguela en Ajustes.';
      } else {
        const cache = AiCache.parse(getAiCache());
        const estimate = estimateAi(scene, result.findings, ignored, settings, cache);
        const go = needsConfirmation(estimate) ? (post({ type: 'ai-estimate', estimate }), await deps.confirmAi(estimate)) : true;
        if (signal.cancelled) {
          post({ type: 'cancelled' });
          return { payload: null };
        }
        if (go) {
          try {
            const ai = await runAiPass({
              scene,
              findings: result.findings,
              ignored,
              settings,
              client: createClient({ apiKey: key, model: settings.model, fetchFn: fetch as unknown as FetchLike }),
              cache,
              signal,
              onProgress: (done, total) => post({ type: 'progress', phase: 'ai', done, total }),
            });
            setAiCache(cache.serialize());
            if (signal.cancelled) {
              post({ type: 'cancelled' });
              return { payload: null };
            }
            aiNames = ai.aiNames;
            aiSummary = ai.summary;
            aiNotice = ai.notice;
            findings = [
              ...result.findings.map((f) => {
                const note = ai.notes[f.id] ?? (ai.aiNames[f.id] ? `Nombre sugerido por la IA: «${ai.aiNames[f.id]}»` : undefined);
                return note ? { ...f, aiNote: note } : f;
              }),
              ...ai.extra,
            ];
          } catch (e) {
            // La clave, el saldo o la conexión fallaron: se explica con claridad y se ofrece revisar sin IA.
            if (e instanceof AiError) return fail(post, e.kind, e.detail);
            throw e;
          }
        }
      }
    }

    const meta = { scope, nodeCount: result.nodeCount, durationMs: Date.now() - started, at: Date.now() };
    const payload: ReviewPayload = {
      findings,
      ignoredIds,
      meta,
      ...(aiSummary ? { aiSummary } : {}),
      ...(Object.keys(aiNames).length ? { aiNames } : {}),
      ...(aiNotice ? { aiNotice } : {}),
    };

    const shown = buildResult(findings, result.nodeCount, ignored);
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
    return { payload, scene, catalog, aiNames };
  } catch (e) {
    if (e instanceof TooLargeError) return fail(post, 'too-large', e.message, e.count);
    return fail(post, 'unknown', e instanceof Error ? e.message : String(e));
  }
}
