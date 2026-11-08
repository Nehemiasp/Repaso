import { useEffect, useMemo, useState } from 'preact/hooks';
import { buildResult } from '../../engine/run';
import type { FixKindGroup, FixPreview, ReviewMeta } from '../../shared/messages';
import { CATEGORIES, SEVERITIES, type Category, type Finding } from '../../shared/types';
import { BatchSheet, Button, Cuadros, Disclosure, EmptyState, FindingRow, Header, IconButton, Notice, Screen, ScoreRing, SeverityBadge, Tabs, Toast } from '../components';
import { CATEGORY_LABEL, FIX_LABEL, RULE_LABEL, plural, t } from '../i18n/es';
import './Screens.css';

const PAGE_SIZE = 50;

export interface BatchState {
  kind: FixKindGroup;
  preview: FixPreview | null;
  applying: boolean;
}

export interface ResultsProps {
  /** Todos los hallazgos de la revisión, incluidos los ignorados. */
  findings: Finding[];
  ignoredIds: string[];
  meta: ReviewMeta;
  aiSummary?: string;
  aiNotice?: string;
  now: number;
  batch: BatchState | null;
  /** Mensaje de confirmación tras aplicar un lote. */
  appliedMessage?: string;
  onSelect: (f: Finding) => void;
  onIgnore: (ids: string[]) => void;
  onUnignore: (ids: string[]) => void;
  onRequestBatch: (kind: FixKindGroup, findingIds: string[]) => void;
  onApplyBatch: (findingIds: string[]) => void;
  onCloseBatch: () => void;
  onExport: () => void;
  onAgain: () => void;
  onHome: () => void;
  onSettings: () => void;
}

export function Results(p: ResultsProps) {
  const ignored = useMemo(() => new Set(p.ignoredIds), [p.ignoredIds]);
  const result = useMemo(() => buildResult(p.findings, p.meta.nodeCount, ignored), [p.findings, p.meta.nodeCount, ignored]);
  const [tab, setTab] = useState<'all' | Category>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [undo, setUndo] = useState<string | null>(null);
  useEffect(() => setLimit(PAGE_SIZE), [tab]);
  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(id);
  }, [undo]);

  const sorted = useMemo(() => {
    const rank = (f: Finding) => (f.status === 'unverifiable' ? 4 : SEVERITIES.indexOf(f.severity));
    return [...result.findings].sort((a, b) => rank(a) - rank(b));
  }, [result.findings]);
  const visible = tab === 'all' ? sorted : sorted.filter((f) => f.category === tab);

  const fixGroups = useMemo(() => {
    const g = new Map<FixKindGroup, string[]>();
    for (const f of visible) if (f.fix) g.set(f.fix.kind, [...(g.get(f.fix.kind) ?? []), f.id]);
    return [...g.entries()];
  }, [visible]);

  const tabs = [
    { id: 'all', label: t.results.all, count: result.findings.length },
    ...CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL[c], count: result.byCategory[c] })),
  ];

  // Sin ningún hallazgo (ni ignorados que revisar): estado vacío positivo.
  if (result.findings.length === 0) {
    return <CleanView {...p} ignoredCount={result.ignored} nodeCount={result.nodeCount} />;
  }

  const ignore = (f: Finding) => {
    p.onIgnore([f.id]);
    setUndo(f.id);
  };

  return (
    <Screen
      header={
        <Header
          title={t.results.title}
          onBack={p.onHome}
          actions={
            <>
              <IconButton icon="refresh" label={t.results.again} onClick={p.onAgain} />
              <IconButton icon="copy" label={t.results.export} onClick={p.onExport} />
              <IconButton icon="sliders" label={t.common.settings} onClick={p.onSettings} />
            </>
          }
        />
      }
      sub={<Tabs tabs={tabs} value={tab} onChange={(id) => setTab(id as 'all' | Category)} ariaLabel="Categorías" />}
      overlay={
        <>
          {p.batch && <BatchSheet preview={p.batch.preview} applying={p.batch.applying} onApply={p.onApplyBatch} onClose={p.onCloseBatch} />}
          {p.appliedMessage && !p.batch && <Toast message={p.appliedMessage} />}
          {undo && !p.appliedMessage && (
            <Toast message={t.results.ignoredToast} action={<Button size="sm" variant="ghost" onClick={() => { p.onUnignore([undo]); setUndo(null); }}>{t.results.undo}</Button>} />
          )}
        </>
      }
    >
      <section class="rp-summary" aria-label="Resumen de la revisión">
        <div class="rp-summary__top">
          <ScoreRing score={result.score.score} size={84} />
          <div class="rp-summary__right">
            <div class="rp-summary__badges">
              {SEVERITIES.map((s) => (
                <SeverityBadge key={s} severity={s} count={result.bySeverity[s]} />
              ))}
            </div>
            <p class="rp-hint">
              {t.results.reviewed(result.nodeCount)} · {p.meta.scope === 'page' ? t.results.scopePage : t.results.scopeSelection} · {t.results.ago(p.now - p.meta.at)}
            </p>
          </div>
        </div>
        <Disclosure summary={t.results.why}>
          <p class="rp-hint">{t.results.whyIntro}</p>
          <table class="rp-breakdown">
            <tbody>
              {result.score.breakdown.map((b) => (
                <tr key={b.ruleId}>
                  <th scope="row">{RULE_LABEL[b.ruleId].name}</th>
                  <td>{b.count}</td>
                  <td>−{b.penalty}{b.capped ? ` (${t.results.capped})` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Disclosure>
        {p.aiSummary && (
          <blockquote class="rp-aisummary">
            <p class="rp-aisummary__title">{t.results.summaryTitle}</p>
            <p>{p.aiSummary}</p>
            <p class="rp-hint">{t.results.summaryBy}</p>
          </blockquote>
        )}
        {p.aiNotice && <Notice tone="warning">{p.aiNotice}</Notice>}
        {result.unverifiable > 0 && <Notice tone="info">{t.results.unverifiedNotice(result.unverifiable)}</Notice>}
      </section>

      {fixGroups.length > 0 && (
        <section class="rp-batchbar" aria-label={t.results.batchTitle}>
          <p class="rp-batchbar__title">{t.results.batchTitle}</p>
          <div class="rp-batchbar__buttons">
            {fixGroups.map(([kind, ids]) => (
              <Button key={kind} size="sm" variant="secondary" icon="wand" onClick={() => p.onRequestBatch(kind, ids)}>
                {FIX_LABEL[kind].verb(ids.length)}
              </Button>
            ))}
          </div>
        </section>
      )}

      {visible.length === 0 ? (
        <EmptyState tone="positive" art={<Cuadros variant="mini" size={40} />} title={t.results.emptyCategory} />
      ) : (
        <ul class="rp-list" aria-label={tab === 'all' ? t.results.all : CATEGORY_LABEL[tab]}>
          {visible.slice(0, limit).map((f) => (
            <FindingRow
              key={f.id}
              finding={f}
              showCategory={tab === 'all'}
              onSelect={p.onSelect}
              onFix={f.fix ? (x) => p.onRequestBatch(x.fix!.kind, [x.id]) : undefined}
              onIgnore={ignore}
            />
          ))}
        </ul>
      )}
      {visible.length > limit && (
        <div class="rp-more">
          <Button variant="secondary" onClick={() => setLimit(limit + PAGE_SIZE)}>{t.results.showMore(Math.min(PAGE_SIZE, visible.length - limit))}</Button>
        </div>
      )}
      {result.ignored > 0 && (
        <div class="rp-ignored">
          <span>{t.results.ignored(result.ignored)}</span>
          <Button size="sm" variant="ghost" onClick={() => p.onUnignore(p.ignoredIds)}>{t.results.restore}</Button>
        </div>
      )}
    </Screen>
  );
}

function CleanView(p: ResultsProps & { ignoredCount: number; nodeCount: number }) {
  return (
    <Screen
      header={<Header title={t.results.title} onBack={p.onHome} actions={<IconButton icon="sliders" label={t.common.settings} onClick={p.onSettings} />} />}
      footer={
        <>
          <Button variant="primary" fullWidth icon="refresh" onClick={p.onAgain}>{t.clean.again}</Button>
          <Button variant="secondary" fullWidth icon="copy" onClick={p.onExport}>{t.clean.export}</Button>
        </>
      }
    >
      <EmptyState tone="positive" art={<Cuadros variant="full" size={136} />} title={t.clean.title}>
        <p>{t.clean.text(p.nodeCount)}</p>
        {p.ignoredCount > 0 && (
          <p class="rp-clean__ignored">
            {t.results.ignored(p.ignoredCount)} · <button type="button" class="rp-link" onClick={() => p.onUnignore(p.ignoredIds)}>{t.results.restore}</button>
          </p>
        )}
      </EmptyState>
      <div class="rp-clean__score"><ScoreRing score={100} size={72} /></div>
      <p class="rp-hint rp-clean__note">{plural(p.nodeCount, 'capa revisada', 'capas revisadas')} · {p.meta.scope === 'page' ? t.results.scopePage : t.results.scopeSelection}</p>
    </Screen>
  );
}
