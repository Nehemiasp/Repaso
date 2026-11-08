import './ProgressBar.css';

export interface ProgressBarProps {
  /** 0..1. Sin valor = indeterminada. */
  value?: number;
  label: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const pct = value === undefined ? undefined : Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div class={`rp-progress ${pct === undefined ? 'is-indeterminate' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div class="rp-progress__bar" style={pct === undefined ? undefined : { width: `${pct}%` }} />
    </div>
  );
}
