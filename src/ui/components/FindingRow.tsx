import type { Finding, NodeType } from '../../shared/types';
import { CATEGORY_LABEL, NODE_TYPE_LABEL, t } from '../i18n/es';
import { Button, IconButton } from './Button';
import { Icon, type IconName } from './Icon';
import { SeverityBadge } from './SeverityBadge';
import './FindingRow.css';

const NODE_ICON: Record<NodeType, IconName> = {
  FRAME: 'frame', GROUP: 'group', SECTION: 'section', TEXT: 'text-node', RECTANGLE: 'rect', ELLIPSE: 'ellipse',
  POLYGON: 'vector', STAR: 'vector', VECTOR: 'vector', LINE: 'line', BOOLEAN_OPERATION: 'vector',
  COMPONENT: 'component', COMPONENT_SET: 'component-set', INSTANCE: 'instance', OTHER: 'layers',
};

export interface FindingRowProps {
  finding: Finding;
  onSelect: (finding: Finding) => void;
  onFix?: (finding: Finding) => void;
  onIgnore: (finding: Finding) => void;
  /** Muestra la categoría (útil en la pestaña «Todas»). */
  showCategory?: boolean;
}

/**
 * Fila de hallazgo: severidad (ícono + palabra), descripción, capa afectada y acciones.
 * El cuerpo es un botón (selecciona la capa y hace zoom); las acciones son botones hermanos,
 * así no hay botones anidados y el teclado recorre: fila → Corregir → Ignorar.
 */
export function FindingRow({ finding, onSelect, onFix, onIgnore, showCategory }: FindingRowProps) {
  const unverified = finding.status === 'unverifiable';
  return (
    <li class="rp-row" data-severity={unverified ? 'unverified' : finding.severity}>
      <button type="button" class="rp-row__main" onClick={() => onSelect(finding)} title={t.results.selectLayer} aria-label={`${finding.message}. ${t.results.selectLayer}: ${finding.nodeName}`}>
        <span class="rp-row__meta">
          <SeverityBadge severity={finding.severity} unverified={unverified} />
          {showCategory && <span class="rp-row__cat">{CATEGORY_LABEL[finding.category]}</span>}
        </span>
        <span class="rp-row__msg">{finding.message}</span>
        <span class="rp-row__layer">
          <Icon name={NODE_ICON[finding.nodeType]} size={14} />
          <span class="rp-row__layername" title={finding.nodeName}>{finding.nodeName || NODE_TYPE_LABEL[finding.nodeType]}</span>
        </span>
        {finding.detail && <span class="rp-row__detail">{finding.detail}</span>}
        {finding.aiNote && (
          <span class="rp-row__ai">
            <span class="rp-row__ailabel"><Icon name="sparkle" size={12} /> {t.results.aiLabel}</span>
            <span class="rp-row__ainote">{finding.aiNote}</span>
          </span>
        )}
      </button>
      <div class="rp-row__actions">
        {finding.fix && onFix && (
          <Button size="sm" variant="secondary" icon="wand" onClick={() => onFix(finding)}>{t.results.fix}</Button>
        )}
        <IconButton size="sm" icon="eye-off" label={`${t.results.ignore}: ${finding.message}`} onClick={() => onIgnore(finding)} />
      </div>
    </li>
  );
}
