import type { ComponentChildren } from 'preact';
import { Icon } from './Icon';
import './Toast.css';

export interface ToastProps {
  message: string;
  action?: ComponentChildren;
}

/** Aviso breve al pie. role=status: se anuncia sin quitar el foco. */
export function Toast({ message, action }: ToastProps) {
  return (
    <div class="rp-toast" role="status" aria-live="polite">
      <Icon name="check-circle" size={16} />
      <span class="rp-toast__msg">{message}</span>
      {action}
    </div>
  );
}
