import { useId } from 'preact/hooks';
import './Segmented.css';

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

/** Grupo de opciones excluyentes. Flechas ← → cambian la opción (patrón radiogroup). */
export function Segmented<T extends string>({ label, value, options, onChange, hideLabel }: SegmentedProps<T>) {
  const id = useId();
  const move = (dir: number) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length]!;
    onChange(next.value);
    requestAnimationFrame(() => document.getElementById(`${id}-${next.value}`)?.focus());
  };
  return (
    <div class="rp-seg">
      <span id={id} class={hideLabel ? 'rp-sr-only' : 'rp-seg__label'}>{label}</span>
      <div class="rp-seg__group" role="radiogroup" aria-labelledby={id}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              id={`${id}-${o.value}`}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              class={`rp-seg__opt ${on ? 'is-on' : ''}`}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
