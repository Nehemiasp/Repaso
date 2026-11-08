import { useId } from 'preact/hooks';
import './Switch.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div class="rp-switch">
      <div class="rp-switch__text">
        <label for={id} class="rp-switch__label">{label}</label>
        {description && <p class="rp-switch__desc" id={`${id}-d`}>{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        class="rp-switch__track"
        onClick={() => onChange(!checked)}
      >
        <span class="rp-switch__thumb" />
      </button>
    </div>
  );
}
