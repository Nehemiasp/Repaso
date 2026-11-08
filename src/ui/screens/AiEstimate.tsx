import type { AiEstimate as Estimate } from '../../shared/messages';
import { formatUsd } from '../../ai/pricing';
import { Button, Header, Icon, Notice, Screen } from '../components';
import { t } from '../i18n/es';
import { MODELS } from './Settings';
import './Screens.css';

export interface AiEstimateProps {
  estimate: Estimate;
  onRun: () => void;
  onSkip: () => void;
}

/** Confirmación antes de gastar: qué revisaría la IA y cuánto costaría. */
export function AiEstimate({ estimate: e, onRun, onSkip }: AiEstimateProps) {
  const rows: [string, string][] = [
    [t.aiEstimate.layers, e.layers.toLocaleString('es')],
    [t.aiEstimate.texts, e.texts.toLocaleString('es')],
    [t.aiEstimate.sets, e.sets.toLocaleString('es')],
    [t.aiEstimate.calls, e.calls.toLocaleString('es')],
    [t.aiEstimate.model, MODELS.find((m) => m.value === e.model)?.label.split(' · ')[0] ?? e.model],
    [t.aiEstimate.budget, formatUsd(e.budgetUsd)],
  ];
  return (
    <Screen
      header={<Header brand title={t.aiEstimate.title} />}
      footer={
        <>
          <Button variant="primary" size="lg" fullWidth icon="sparkle" onClick={onRun}>{t.aiEstimate.run}</Button>
          <Button variant="secondary" fullWidth onClick={onSkip}>{t.aiEstimate.skip}</Button>
        </>
      }
    >
      <div class="rp-estimate">
        <p class="rp-hint">{t.aiEstimate.intro}</p>
        <div class="rp-estimate__cost" role="status">
          <span class="rp-estimate__label">{t.aiEstimate.cost}</span>
          <span class="rp-estimate__value">≈ {formatUsd(e.costUsd)}</span>
        </div>
        {e.overBudget && <Notice tone="warning">{t.aiEstimate.over}</Notice>}
        <dl class="rp-estimate__rows">
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <p class="rp-hint">{t.aiEstimate.cached}</p>
        <p class="rp-hint rp-estimate__sends"><Icon name="shield" size={14} /> {t.aiEstimate.sends}</p>
      </div>
    </Screen>
  );
}
