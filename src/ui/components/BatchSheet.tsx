import { useMemo, useState } from 'preact/hooks';
import type { FixPreview } from '../../shared/messages';
import { FIX_LABEL, t } from '../i18n/es';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { Sheet } from './Sheet';
import './BatchSheet.css';

export interface BatchSheetProps {
  /** null = cargando vista previa. */
  preview: FixPreview | null;
  applying: boolean;
  onApply: (findingIds: string[]) => void;
  onClose: () => void;
}

/** Corrección en lote con vista previa: antes → después, con casillas para quitar las que no se quieren. */
export function BatchSheet({ preview, applying, onApply, onClose }: BatchSheetProps) {
  const items = preview?.items ?? [];
  const [off, setOff] = useState<Set<string>>(new Set());
  const selected = useMemo(() => items.filter((i) => !off.has(i.findingId)), [items, off]);
  const allOn = selected.length === items.length;
  const toggle = (id: string, on: boolean) => {
    const next = new Set(off);
    if (on) next.delete(id);
    else next.add(id);
    setOff(next);
  };
  const title = preview ? FIX_LABEL[preview.kind].title : t.batch.title;
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={applying}>{t.batch.cancel}</Button>
          <Button variant="primary" icon="check" loading={applying} disabled={selected.length === 0 || !preview} onClick={() => onApply(selected.map((i) => i.findingId))}>
            {applying ? t.batch.applying : t.batch.apply(selected.length)}
          </Button>
        </>
      }
    >
      {!preview ? (
        <p class="rp-batch__loading" role="status">{t.batch.loading}</p>
      ) : (
        <>
          <p class="rp-batch__intro">{t.batch.intro}</p>
          <div class="rp-batch__bar">
            <Checkbox
              label={t.batch.selectAll}
              checked={allOn}
              indeterminate={!allOn && selected.length > 0}
              onChange={(on) => setOff(on ? new Set() : new Set(items.map((i) => i.findingId)))}
            />
            <span class="rp-batch__count" aria-live="polite">{selected.length} / {items.length}</span>
          </div>
          {selected.length === 0 && <Notice tone="warning">{t.batch.none}</Notice>}
          <ul class="rp-batch__list">
            {items.map((i) => {
              const on = !off.has(i.findingId);
              return (
                <li key={i.findingId} class={`rp-batch__item ${on ? '' : 'is-off'}`}>
                  <Checkbox hideLabel label={`${i.nodeName}: ${i.before} → ${i.after}`} checked={on} onChange={(v) => toggle(i.findingId, v)} />
                  <div class="rp-batch__diff">
                    <span class="rp-batch__before" title={i.before}><span class="rp-sr-only">{t.batch.before}: </span>{i.before}</span>
                    <Icon name="arrow-left" size={12} class="rp-batch__arrow" />
                    <span class="rp-batch__after" title={i.after}><span class="rp-sr-only">{t.batch.after}: </span>{i.after}</span>
                    {i.source && <span class="rp-batch__src">{i.source === 'ai' ? t.batch.sourceAi : t.batch.sourceType}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Sheet>
  );
}
