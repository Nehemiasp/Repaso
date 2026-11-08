import { useId, useState } from 'preact/hooks';
import { t } from '../i18n/es';
import { IconButton } from './Button';
import './Field.css';

export interface FieldProps {
  label: string;
  value: string;
  onInput: (value: string) => void;
  type?: 'text' | 'password';
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  /** Para claves: agrega el botón de mostrar/ocultar. */
  reveal?: boolean;
  autoComplete?: string;
  mono?: boolean;
}

export function Field({ label, value, onInput, type = 'text', placeholder, hint, error, disabled, reveal, autoComplete = 'off', mono }: FieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  return (
    <div class={`rp-field ${error ? 'rp-field--error' : ''}`}>
      <label class="rp-field__label" for={id}>{label}</label>
      <div class="rp-field__control">
        <input
          id={id}
          class={`rp-field__input ${mono ? 'rp-field__input--mono' : ''}`}
          type={(reveal && shown ? 'text' : type) as 'text'}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          spellcheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
        />
        {reveal && (
          <IconButton
            class="rp-field__reveal"
            size="sm"
            icon={shown ? 'eye-off' : 'eye'}
            label={shown ? t.settings.keyHide : t.settings.keyShow}
            pressed={shown}
            onClick={() => setShown(!shown)}
          />
        )}
      </div>
      {error ? (
        <p class="rp-field__msg rp-field__msg--error" id={`${id}-e`} role="alert">{error}</p>
      ) : (
        hint && <p class="rp-field__msg" id={`${id}-h`}>{hint}</p>
      )}
    </div>
  );
}

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
}

/** Campo numérico con pasos; el valor siempre queda dentro de min–max. */
export function NumberField({ label, value, onChange, min, max, step = 1, unit, hint }: NumberFieldProps) {
  const id = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n / step) * step));
  const decimals = String(step).includes('.') ? String(step).split('.')[1]!.length : 0;
  return (
    <div class="rp-field rp-field--number">
      <label class="rp-field__label" for={id}>{label}</label>
      <div class="rp-field__control rp-field__control--number">
        <IconButton size="sm" variant="secondary" icon="minus" label={`Disminuir ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))} />
        <input
          id={id}
          class="rp-field__input rp-field__input--center"
          inputMode="decimal"
          value={value.toFixed(decimals)}
          aria-describedby={hint ? `${id}-h` : undefined}
          onChange={(e) => {
            const n = parseFloat((e.currentTarget as HTMLInputElement).value.replace(',', '.'));
            onChange(Number.isFinite(n) ? clamp(n) : value);
          }}
        />
        <IconButton size="sm" variant="secondary" icon="plus" label={`Aumentar ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))} />
        {unit && <span class="rp-field__unit">{unit}</span>}
      </div>
      {hint && <p class="rp-field__msg" id={`${id}-h`}>{hint}</p>}
    </div>
  );
}

export interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
}

export function Select({ label, value, options, onChange, hint }: SelectProps) {
  const id = useId();
  return (
    <div class="rp-field">
      <label class="rp-field__label" for={id}>{label}</label>
      <select id={id} class="rp-field__input rp-field__select" value={value} onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)} aria-describedby={hint ? `${id}-h` : undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p class="rp-field__msg" id={`${id}-h`}>{hint}</p>}
    </div>
  );
}
