import type { Severity } from '../../shared/types';
import { SEVERITY_LABEL, t } from '../i18n/es';
import { Icon, type IconName } from './Icon';
import './SeverityBadge.css';

const ICON: Record<Severity, IconName> = {
  critical: 'sev-critical',
  high: 'sev-high',
  medium: 'sev-medium',
  low: 'sev-low',
};

export interface SeverityBadgeProps {
  severity: Severity;
  /** «No verificado» reemplaza a la severidad cuando no se pudo comprobar. */
  unverified?: boolean;
  /** Solo ícono + texto corto, sin fondo. */
  compact?: boolean;
  count?: number;
}

/** La severidad nunca va solo en color: siempre silueta distinta + palabra. */
export function SeverityBadge({ severity, unverified, compact, count }: SeverityBadgeProps) {
  const tone = unverified ? 'unverified' : severity;
  const label = unverified ? t.results.unverified : SEVERITY_LABEL[severity];
  return (
    <span class={`rp-sev rp-sev--${tone} ${compact ? 'rp-sev--compact' : ''}`.trim()}>
      <Icon name={unverified ? 'help' : ICON[severity]} size={14} />
      <span class="rp-sev__label">{label}</span>
      {count !== undefined && <span class="rp-sev__count">{count.toLocaleString('es')}</span>}
    </span>
  );
}
