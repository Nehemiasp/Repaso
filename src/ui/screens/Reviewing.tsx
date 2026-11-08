import type { Phase } from '../../shared/messages';
import { Button, Header, ProgressBar, Screen, Spinner } from '../components';
import { PHASE_LABEL, t } from '../i18n/es';
import './Screens.css';

export interface ReviewingProps {
  phase: Phase;
  done: number;
  /** 0 = aún no se conoce el total. */
  total: number;
  cancelling: boolean;
  onCancel: () => void;
}

export function Reviewing({ phase, done, total, cancelling, onCancel }: ReviewingProps) {
  const known = total > 0;
  return (
    <Screen
      header={<Header brand title={t.reviewing.title} />}
      footer={<Button variant="secondary" fullWidth loading={cancelling} onClick={onCancel}>{cancelling ? t.reviewing.cancelling : t.reviewing.cancel}</Button>}
    >
      <div class="rp-reviewing" role="status" aria-live="polite">
        <Spinner size={28} />
        <p class="rp-reviewing__phase">{PHASE_LABEL[phase]}</p>
        <div class="rp-reviewing__bar">
          <ProgressBar value={known ? done / total : undefined} label={PHASE_LABEL[phase]} />
        </div>
        <p class="rp-hint">{known ? t.reviewing.progress(done, total) : t.reviewing.starting}</p>
        <p class="rp-hint">{t.reviewing.keepWorking}</p>
      </div>
    </Screen>
  );
}
