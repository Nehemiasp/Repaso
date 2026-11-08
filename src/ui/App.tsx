import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildResult } from '../engine/run';
import { RULE_IDS } from '../shared/constants';
import type { AiEstimate as Estimate, ErrorKind, FixKindGroup, InitPayload, LastSummary, Phase, ReviewPayload, Scope, ToPlugin, ToUi } from '../shared/messages';
import type { Finding, Settings as SettingsT } from '../shared/types';
import { ResizeHandle, Toast } from './components';
import { About, AiEstimate, ErrorScreen, Export, Home, Results, Reviewing, Settings, Welcome, type BatchState, type ErrorAction, type KeyCheckState } from './screens';
import { t } from './i18n/es';

export interface Bridge {
  send: (msg: ToPlugin) => void;
  /** Registra el receptor de mensajes del plugin; devuelve la función para quitarlo. */
  listen: (handler: (msg: ToUi) => void) => () => void;
}

type Route =
  | { name: 'welcome' }
  | { name: 'home' }
  | { name: 'reviewing' }
  | { name: 'ai-estimate' }
  | { name: 'results' }
  | { name: 'error'; kind: ErrorKind; detail?: string }
  | { name: 'settings' }
  | { name: 'export' }
  | { name: 'about' };

const summarize = (review: ReviewPayload): LastSummary => {
  const r = buildResult(review.findings, review.meta.nodeCount, new Set(review.ignoredIds));
  return {
    score: r.score.score,
    total: r.findings.length,
    critical: r.bySeverity.critical,
    high: r.bySeverity.high,
    medium: r.bySeverity.medium,
    low: r.bySeverity.low,
    scope: review.meta.scope,
    nodeCount: review.meta.nodeCount,
    at: review.meta.at,
  };
};

export function App({ bridge }: { bridge: Bridge }) {
  const [init, setInit] = useState<InitPayload | null>(null);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [scope, setScope] = useState<Scope>('selection');
  const [selectionCount, setSelectionCount] = useState(0);
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [keyHint, setKeyHint] = useState<string | undefined>();
  const [keyCheck, setKeyCheck] = useState<KeyCheckState>({ status: 'idle' });
  const [progress, setProgress] = useState<{ phase: Phase; done: number; total: number }>({ phase: 'reading', done: 0, total: 0 });
  const [cancelling, setCancelling] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [last, setLast] = useState<LastSummary | null>(null);
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [applied, setApplied] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(Date.now());
  const saveTimer = useRef<number | undefined>(undefined);

  const route = stack[stack.length - 1]!;
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const reset = useCallback((r: Route) => setStack([r]), []);

  useEffect(() => {
    const off = bridge.listen((m) => {
      switch (m.type) {
        case 'init':
          setInit(m.payload);
          setSettings(m.payload.settings);
          setHasKey(m.payload.hasApiKey);
          setKeyHint(m.payload.keyHint);
          setSelectionCount(m.payload.selectionCount);
          setLast(m.payload.last);
          setStack([m.payload.firstRun ? { name: 'welcome' } : { name: 'home' }]);
          break;
        case 'selection':
          setSelectionCount(m.count);
          break;
        case 'progress':
          setProgress({ phase: m.phase, done: m.done, total: m.total });
          break;
        case 'ai-estimate':
          setEstimate(m.estimate);
          setStack((s) => [...s.filter((r) => r.name !== 'reviewing'), { name: 'ai-estimate' }]);
          break;
        case 'result':
          setReview(m.payload);
          setLast(summarize(m.payload));
          setNow(Date.now());
          setCancelling(false);
          setStack([{ name: 'home' }, { name: 'results' }]);
          break;
        case 'cancelled':
          setCancelling(false);
          reset({ name: 'home' });
          break;
        case 'error':
          setCancelling(false);
          setStack((s) => [...s.filter((r) => r.name !== 'reviewing'), { name: 'error', kind: m.kind, detail: m.detail }]);
          break;
        case 'fix-preview':
          setBatch({ kind: m.preview.kind, preview: m.preview, applying: false });
          break;
        case 'fix-applied': {
          setBatch(null);
          const fixed = new Set(m.fixedIds);
          setReview((r) => (r ? { ...r, findings: r.findings.filter((f) => !fixed.has(f.id)) } : r));
          setApplied(`${t.batch.applied(m.applied)}${m.skipped ? ` ${t.batch.skipped(m.skipped)}` : ''}`);
          setTimeout(() => setApplied(undefined), 6000);
          break;
        }
        case 'ignored':
          setReview((r) => (r ? { ...r, ignoredIds: m.ids } : r));
          break;
        case 'key-check':
          setKeyCheck(m.ok ? { status: 'ok' } : { status: 'error', message: m.detail ?? 'No se pudo validar la clave.' });
          break;
        case 'settings':
          setSettings(m.settings);
          setHasKey(m.hasApiKey);
          setKeyHint(m.keyHint);
          break;
      }
    });
    bridge.send({ type: 'ready' });
    return off;
  }, [bridge, reset]);

  const startReview = useCallback(
    (s: Scope, noAi = false) => {
      setScope(s);
      setProgress({ phase: 'reading', done: 0, total: 0 });
      setCancelling(false);
      setStack((st) => [...st.filter((r) => r.name !== 'error' && r.name !== 'reviewing' && r.name !== 'ai-estimate'), { name: 'reviewing' }]);
      bridge.send({ type: 'review', scope: s, ...(noAi ? { noAi: true } : {}) });
    },
    [bridge],
  );

  const changeSettings = useCallback(
    (s: SettingsT) => {
      setSettings(s);
      setSaved(false);
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        bridge.send({ type: 'save-settings', settings: s });
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1800);
      }, 300);
    },
    [bridge],
  );

  const onError = useCallback(
    (a: ErrorAction) => {
      if (a === 'retry') return startReview(scope);
      if (a === 'page') return startReview('page');
      if (a === 'settings') return push({ name: 'settings' });
      if (a === 'home') return reset({ name: 'home' });
      // «Revisar sin IA»: solo esta vez; el ajuste no se toca.
      startReview(scope, true);
    },
    [push, reset, scope, startReview],
  );

  const aiState: 'on' | 'off' | 'no-key' = useMemo(() => (!settings?.aiEnabled ? 'off' : hasKey ? 'on' : 'no-key'), [settings, hasKey]);

  if (!init || !settings) return <p class="rp-hint" style={{ padding: '16px' }} role="status">{t.common.loading}</p>;

  const requestBatch = (kind: FixKindGroup, findingIds: string[]) => {
    setApplied(undefined);
    setBatch({ kind, preview: null, applying: false });
    bridge.send({ type: 'request-fix-preview', kind, findingIds });
  };

  let screen;
  switch (route.name) {
    case 'welcome':
      screen = (
        <Welcome
          onStart={() => {
            bridge.send({ type: 'dismiss-welcome' });
            startReview('selection');
          }}
          onSettings={() => {
            bridge.send({ type: 'dismiss-welcome' });
            push({ name: 'settings' });
          }}
          onAbout={() => push({ name: 'about' })}
        />
      );
      break;
    case 'home':
      screen = (
        <Home
          scope={scope}
          onScope={setScope}
          selectionCount={selectionCount}
          last={last}
          rulesOn={RULE_IDS.filter((id) => settings.rules[id] !== false).length}
          rulesTotal={RULE_IDS.length}
          ai={aiState}
          now={now}
          onReview={() => startReview(scope)}
          onViewResults={() => (review ? push({ name: 'results' }) : startReview(last?.scope ?? scope))}
          onSettings={() => push({ name: 'settings' })}
          onAbout={() => push({ name: 'about' })}
        />
      );
      break;
    case 'reviewing':
      screen = (
        <Reviewing
          {...progress}
          cancelling={cancelling}
          onCancel={() => {
            setCancelling(true);
            bridge.send({ type: 'cancel' });
          }}
        />
      );
      break;
    case 'ai-estimate':
      screen = estimate ? (
        <AiEstimate
          estimate={estimate}
          onRun={() => {
            setProgress({ phase: 'ai', done: 0, total: 0 });
            setStack((s) => [...s.filter((r) => r.name !== 'ai-estimate'), { name: 'reviewing' }]);
            bridge.send({ type: 'ai-decision', run: true });
          }}
          onSkip={() => {
            setProgress({ phase: 'checking', done: 0, total: 0 });
            setStack((s) => [...s.filter((r) => r.name !== 'ai-estimate'), { name: 'reviewing' }]);
            bridge.send({ type: 'ai-decision', run: false });
          }}
        />
      ) : null;
      break;
    case 'results':
      screen = review ? (
        <Results
          findings={review.findings}
          ignoredIds={review.ignoredIds}
          meta={review.meta}
          aiSummary={review.aiSummary}
          aiNotice={review.aiNotice}
          now={now}
          batch={batch}
          appliedMessage={applied}
          onSelect={(f: Finding) => bridge.send({ type: 'select-node', nodeId: f.nodeId })}
          onIgnore={(ids) => {
            setReview({ ...review, ignoredIds: [...new Set([...review.ignoredIds, ...ids])] });
            bridge.send({ type: 'ignore', ids });
          }}
          onUnignore={(ids) => {
            setReview({ ...review, ignoredIds: review.ignoredIds.filter((i) => !ids.includes(i)) });
            bridge.send({ type: 'unignore', ids });
          }}
          onRequestBatch={requestBatch}
          onApplyBatch={(ids) => {
            if (!batch) return;
            setBatch({ ...batch, applying: true });
            bridge.send({ type: 'apply-fixes', kind: batch.kind, findingIds: ids });
          }}
          onCloseBatch={() => setBatch(null)}
          onExport={() => push({ name: 'export' })}
          onAgain={() => startReview(review.meta.scope)}
          onHome={() => reset({ name: 'home' })}
          onSettings={() => push({ name: 'settings' })}
        />
      ) : null;
      break;
    case 'error':
      screen = <ErrorScreen kind={route.kind} detail={route.detail} onAction={onError} />;
      break;
    case 'settings':
      screen = (
        <Settings
          settings={settings}
          onChange={changeSettings}
          hasKey={hasKey}
          keyHint={keyHint}
          keyCheck={keyCheck}
          ignoredCount={review?.ignoredIds.length ?? init.ignoredCount}
          saved={saved}
          onSaveKey={(key) => {
            setKeyCheck({ status: 'idle' });
            bridge.send({ type: 'save-key', key });
          }}
          onClearKey={() => {
            setKeyCheck({ status: 'idle' });
            bridge.send({ type: 'clear-key' });
          }}
          onCheckKey={(key) => {
            setKeyCheck({ status: 'checking' });
            bridge.send({ type: 'check-key', key });
          }}
          onClearIgnored={() => {
            setReview((r) => (r ? { ...r, ignoredIds: [] } : r));
            bridge.send({ type: 'clear-ignored' });
          }}
          onBack={back}
          onAbout={() => push({ name: 'about' })}
        />
      );
      break;
    case 'export':
      screen = <Export review={review} onBack={back} />;
      break;
    case 'about':
      screen = <About version={init.version} onBack={back} />;
      break;
  }

  return (
    <div class="rp-app">
      {screen}
      <ResizeHandle onResize={(size) => bridge.send({ type: 'resize', ...size })} />
      {route.name !== 'results' && applied && <Toast message={applied} />}
    </div>
  );
}
