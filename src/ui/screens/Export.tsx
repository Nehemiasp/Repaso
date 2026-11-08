import { useMemo, useState } from 'preact/hooks';
import type { ReviewPayload } from '../../shared/messages';
import { buildReport } from '../../shared/report';
import { copyText } from '../clipboard';
import { Button, Checkbox, EmptyState, Header, Notice, Screen } from '../components';
import { t } from '../i18n/es';
import './Screens.css';

export interface ExportProps {
  review: ReviewPayload | null;
  fileName?: string;
  onBack: () => void;
}

export function Export({ review, fileName, onBack }: ExportProps) {
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [includeDetail, setIncludeDetail] = useState(true);
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const markdown = useMemo(
    () => (review ? buildReport({ ...review, fileName, includeIgnored, includeDetail }) : ''),
    [review, fileName, includeIgnored, includeDetail],
  );
  if (!review) {
    return (
      <Screen header={<Header title={t.export.title} onBack={onBack} />}>
        <EmptyState title={t.export.title} art={null}>{t.export.empty}</EmptyState>
      </Screen>
    );
  }
  return (
    <Screen
      header={<Header title={t.export.title} onBack={onBack} />}
      footer={
        <Button variant="primary" size="lg" fullWidth icon={state === 'copied' ? 'check' : 'copy'} onClick={async () => setState((await copyText(markdown)) ? 'copied' : 'failed')}>
          {state === 'copied' ? t.export.copied : t.export.copy}
        </Button>
      }
    >
      <div class="rp-export">
        <p class="rp-hint">{t.export.intro}</p>
        <div class="rp-export__opts">
          <Checkbox label={t.export.includeDetail} checked={includeDetail} onChange={setIncludeDetail} />
          <Checkbox label={t.export.includeIgnored} checked={includeIgnored} onChange={setIncludeIgnored} />
        </div>
        {state === 'failed' && <Notice tone="warning">{t.export.copyFailed}</Notice>}
        <label class="rp-export__label" for="rp-md">{t.export.preview}</label>
        <textarea id="rp-md" class="rp-export__text" readOnly value={markdown} rows={14} onFocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()} />
      </div>
    </Screen>
  );
}
