import type { ComponentChildren } from 'preact';
import { t } from '../i18n/es';
import { IconButton } from './Button';
import { Cuadros } from './Cuadros';
import './Header.css';

export interface HeaderProps {
  title: string;
  onBack?: () => void;
  /** Muestra el motivo de cuadros mini junto al título. */
  brand?: boolean;
  actions?: ComponentChildren;
}

export function Header({ title, onBack, brand, actions }: HeaderProps) {
  return (
    <header class="rp-header">
      {onBack ? <IconButton icon="arrow-left" label={t.common.back} onClick={onBack} /> : brand && <span class="rp-header__brand"><Cuadros variant="mini" /></span>}
      <h1 class="rp-header__title">{title}</h1>
      {actions && <div class="rp-header__actions">{actions}</div>}
    </header>
  );
}
