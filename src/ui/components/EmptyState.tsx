import type { ComponentChildren } from 'preact';
import './EmptyState.css';

export interface EmptyStateProps {
  /** Ilustración o ícono grande. */
  art?: ComponentChildren;
  title: string;
  children?: ComponentChildren;
  actions?: ComponentChildren;
  tone?: 'neutral' | 'positive' | 'warning' | 'error';
}

export function EmptyState({ art, title, children, actions, tone = 'neutral' }: EmptyStateProps) {
  return (
    <div class={`rp-empty rp-empty--${tone}`}>
      {art && <div class="rp-empty__art">{art}</div>}
      <h2 class="rp-empty__title">{title}</h2>
      {children && <div class="rp-empty__text">{children}</div>}
      {actions && <div class="rp-empty__actions">{actions}</div>}
    </div>
  );
}
