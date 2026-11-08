import type { LastSummary, Scope } from '../../shared/messages';
import { Button, Header, IconButton, Notice, Screen, ScoreRing, Segmented, SeverityBadge } from '../components';
import { plural, t } from '../i18n/es';
import './Screens.css';

export interface HomeProps {
  scope: Scope;
  onScope: (s: Scope) => void;
  selectionCount: number;
  last: LastSummary | null;
  rulesOn: number;
  rulesTotal: number;
  ai: 'on' | 'off' | 'no-key';
  /** Marca de tiempo actual (se inyecta para que la galería sea determinista). */
  now: number;
  onReview: () => void;
  onViewResults: () => void;
  onSettings: () => void;
  onAbout: () => void;
}

export function Home({ scope, onScope, selectionCount, last, rulesOn, rulesTotal, ai, now, onReview, onViewResults, onSettings, onAbout }: HomeProps) {
  const needsSelection = scope === 'selection' && selectionCount === 0;
  return (
    <Screen
      header={
        <Header
          brand
          title={t.appName}
          actions={
            <>
              <IconButton icon="info" label={t.common.about} onClick={onAbout} />
              <IconButton icon="sliders" label={t.common.settings} onClick={onSettings} />
            </>
          }
        />
      }
    >
      <div class="rp-home">
        <section class="rp-card" aria-labelledby="scope-h">
          <Segmented
            label={t.home.scope}
            value={scope}
            onChange={onScope}
            options={[
              { value: 'selection', label: `${t.home.selection}${selectionCount ? ` (${selectionCount})` : ''}` },
              { value: 'page', label: t.home.page },
            ]}
          />
          <p class="rp-hint" id="scope-h">
            {scope === 'selection' ? (selectionCount === 0 ? t.home.selectionHint : t.home.selectionCount(selectionCount)) : t.home.pageHint}
          </p>
          {needsSelection && <Notice tone="warning">{t.home.selectionCount(0)}. {t.home.selectionHint}</Notice>}
          <Button variant="primary" size="lg" fullWidth icon="search" onClick={onReview}>{t.home.review}</Button>
        </section>

        <section class="rp-card" aria-labelledby="last-h">
          <h2 class="rp-card__title" id="last-h">{t.home.last}</h2>
          {last ? (
            <div class="rp-last">
              <ScoreRing score={last.score} size={64} />
              <div class="rp-last__body">
                <div class="rp-last__badges">
                  {last.critical > 0 && <SeverityBadge severity="critical" count={last.critical} />}
                  {last.high > 0 && <SeverityBadge severity="high" count={last.high} />}
                  {last.medium > 0 && <SeverityBadge severity="medium" count={last.medium} />}
                  {last.low > 0 && <SeverityBadge severity="low" count={last.low} />}
                  {last.total === 0 && <span class="rp-hint">{t.clean.title}</span>}
                </div>
                <p class="rp-hint">
                  {plural(last.nodeCount, 'capa', 'capas')} · {last.scope === 'page' ? t.results.scopePage : t.results.scopeSelection} · {t.results.ago(now - last.at)}
                </p>
                <Button size="sm" variant="ghost" iconRight="chevron-right" onClick={onViewResults}>{t.home.viewResults}</Button>
              </div>
            </div>
          ) : (
            <p class="rp-hint">{t.home.noLast}</p>
          )}
        </section>

        <ul class="rp-chips" aria-label="Estado de la configuración">
          <li class="rp-chip">{t.home.rulesOn(rulesOn, rulesTotal)}</li>
          <li class={`rp-chip ${ai === 'on' ? 'rp-chip--on' : ''}`}>{ai === 'on' ? t.home.aiOn : ai === 'off' ? t.home.aiOff : t.home.aiNoKey}</li>
        </ul>
      </div>
    </Screen>
  );
}
