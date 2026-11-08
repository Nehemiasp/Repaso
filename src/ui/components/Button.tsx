import type { ButtonHTMLAttributes, ComponentChildren } from 'preact';
import { Icon, type IconName } from './Icon';
import './Button.css';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'icon'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  children?: ComponentChildren;
}

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, loading, fullWidth, disabled, children, class: cls, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      class={`rp-btn rp-btn--${variant} rp-btn--${size} ${fullWidth ? 'rp-btn--full' : ''} ${cls ?? ''}`.trim()}
    >
      {loading ? <span class="rp-btn__spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children !== undefined && <span class="rp-btn__label">{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'icon'> {
  icon: IconName;
  /** Nombre accesible (obligatorio: el botón no tiene texto). */
  label: string;
  variant?: 'ghost' | 'secondary';
  size?: 'sm' | 'md';
  pressed?: boolean;
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', pressed, class: cls, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      class={`rp-iconbtn rp-iconbtn--${variant} rp-iconbtn--${size} ${cls ?? ''}`.trim()}
    >
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
    </button>
  );
}
