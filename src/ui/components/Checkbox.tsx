import { useId } from 'preact/hooks';
import { Icon } from './Icon';
import './Checkbox.css';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Oculta el texto pero lo conserva para lectores de pantalla. */
  hideLabel?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, hideLabel, indeterminate, disabled }: CheckboxProps) {
  const id = useId();
  return (
    <label class="rp-check" for={id}>
      <input
        id={id}
        type="checkbox"
        class="rp-check__input"
        checked={checked}
        disabled={disabled}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate;
        }}
        onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)}
      />
      <span class="rp-check__box" aria-hidden="true">
        {indeterminate ? <Icon name="minus" size={12} /> : checked && <Icon name="check" size={12} />}
      </span>
      <span class={hideLabel ? 'rp-sr-only' : 'rp-check__label'}>{label}</span>
    </label>
  );
}
