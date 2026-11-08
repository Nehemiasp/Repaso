import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef } from 'preact/hooks';
import { t } from '../i18n/es';
import { IconButton } from './Button';
import './Sheet.css';

export interface SheetProps {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
}

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Panel modal que sube desde abajo. Atrapa el foco, se cierra con Esc y devuelve el foco al abrirlo. */
export function Sheet({ title, onClose, children, footer }: SheetProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, []);
  return (
    <div class="rp-sheet__scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        class="rp-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        ref={ref}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
          if (e.key === 'Tab' && ref.current) {
            const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
          }
        }}
      >
        <div class="rp-sheet__head">
          <h2 id={id} class="rp-sheet__title">{title}</h2>
          <IconButton icon="x" label={t.common.close} onClick={onClose} />
        </div>
        <div class="rp-sheet__body rp-scroll">{children}</div>
        {footer && <div class="rp-sheet__foot">{footer}</div>}
      </div>
    </div>
  );
}
