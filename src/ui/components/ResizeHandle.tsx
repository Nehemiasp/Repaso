import { t } from '../i18n/es';
import './ResizeHandle.css';

export const MIN_SIZE = { width: 320, height: 440 };
export const MAX_SIZE = { width: 640, height: 900 };

export interface ResizeHandleProps {
  onResize: (size: { width: number; height: number }) => void;
}

/** Asa en la esquina inferior derecha: arrastrar o usar flechas con el foco. */
export function ResizeHandle({ onResize }: ResizeHandleProps) {
  const clamp = (w: number, h: number) => ({
    width: Math.min(MAX_SIZE.width, Math.max(MIN_SIZE.width, Math.round(w))),
    height: Math.min(MAX_SIZE.height, Math.max(MIN_SIZE.height, Math.round(h))),
  });
  return (
    <button
      type="button"
      class="rp-resize"
      aria-label={t.common.resize}
      title={t.common.resize}
      onPointerDown={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.setPointerCapture(e.pointerId);
        const start = { x: e.clientX, y: e.clientY, w: window.innerWidth, h: window.innerHeight };
        const move = (ev: PointerEvent) => onResize(clamp(start.w + ev.clientX - start.x, start.h + ev.clientY - start.y));
        const up = () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 10;
        const d: Record<string, [number, number]> = { ArrowRight: [step, 0], ArrowLeft: [-step, 0], ArrowDown: [0, step], ArrowUp: [0, -step] };
        const delta = d[e.key];
        if (delta) { e.preventDefault(); onResize(clamp(window.innerWidth + delta[0], window.innerHeight + delta[1])); }
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M11 5L5 11M11 9l-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" /></svg>
    </button>
  );
}
