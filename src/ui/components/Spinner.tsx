import './Spinner.css';

export function Spinner({ size = 20 }: { size?: number }) {
  return <span class="rp-spinner" style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true" />;
}
