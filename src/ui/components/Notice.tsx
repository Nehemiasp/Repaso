import type { ComponentChildren } from 'preact';
import { Icon, type IconName } from './Icon';
import { IconButton } from './Button';
import './Notice.css';

const ICON: Record<NoticeTone, IconName> = { info: 'info', success: 'check-circle', warning: 'sev-high', error: 'sev-critical' };
export type NoticeTone = 'info' | 'success' | 'warning' | 'error';

export interface NoticeProps {
  tone?: NoticeTone;
  title?: string;
  children?: ComponentChildren;
  action?: ComponentChildren;
  onDismiss?: () => void;
}

export function Notice({ tone = 'info', title, children, action, onDismiss }: NoticeProps) {
  return (
    <div class={`rp-notice rp-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ICON[tone]} size={16} class="rp-notice__icon" />
      <div class="rp-notice__body">
        {title && <p class="rp-notice__title">{title}</p>}
        {children && <div class="rp-notice__text">{children}</div>}
        {action && <div class="rp-notice__action">{action}</div>}
      </div>
      {onDismiss && <IconButton size="sm" icon="x" label="Cerrar aviso" onClick={onDismiss} />}
    </div>
  );
}
