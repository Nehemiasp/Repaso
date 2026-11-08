import type { ErrorKind } from '../../shared/messages';
import { Button, EmptyState, Header, Icon, Screen, type IconName } from '../components';
import { ERRORS, t } from '../i18n/es';
import './Screens.css';

const ICON: Record<ErrorKind, IconName> = {
  'no-selection': 'frame',
  'empty-selection': 'layers',
  'too-large': 'file-large',
  'ai-key-invalid': 'key',
  'ai-no-credit': 'sev-medium',
  'ai-offline': 'wifi-off',
  'ai-rate-limit': 'hourglass',
  unknown: 'sev-critical',
};

export type ErrorAction = 'retry' | 'page' | 'settings' | 'no-ai' | 'home';

export interface ErrorScreenProps {
  kind: ErrorKind;
  /** Texto técnico (código de la API, etc.), se muestra plegado. */
  detail?: string;
  onAction: (a: ErrorAction) => void;
}

const LABEL: Record<ErrorAction, string> = {
  retry: t.errors.retry,
  page: t.errors.reviewPage,
  settings: t.errors.openSettings,
  'no-ai': t.errors.withoutAi,
  home: t.errors.home,
};

export function ErrorScreen({ kind, detail, onAction }: ErrorScreenProps) {
  const e = ERRORS[kind];
  const tone = kind === 'unknown' || kind === 'ai-key-invalid' ? 'error' : 'warning';
  return (
    <Screen header={<Header title={t.appName} brand actions={<span />} />}>
      <EmptyState
        tone={tone}
        art={<Icon name={ICON[kind]} size={48} />}
        title={e.title}
        actions={
          <>
            {e.primary && <Button variant="primary" onClick={() => onAction(e.primary!)}>{LABEL[e.primary]}</Button>}
            {e.secondary && <Button variant="secondary" onClick={() => onAction(e.secondary!)}>{LABEL[e.secondary]}</Button>}
          </>
        }
      >
        <p>{e.message}</p>
        {e.steps && (
          <ol class="rp-steps">
            {e.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        )}
        {detail && (
          <details class="rp-detail">
            <summary>{t.errors.detail}</summary>
            <code>{detail}</code>
          </details>
        )}
      </EmptyState>
    </Screen>
  );
}
