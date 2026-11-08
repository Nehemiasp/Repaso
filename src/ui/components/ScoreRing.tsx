import { t } from '../i18n/es';
import './ScoreRing.css';

export interface ScoreRingProps {
  score: number;
  size?: number;
}

/** Puntaje 0–100. El número y la palabra «de 100» van siempre; el color solo refuerza. */
export function ScoreRing({ score, size = 84 }: ScoreRingProps) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const tone = score >= 90 ? 'good' : score >= 60 ? 'ok' : 'bad';
  return (
    <div class={`rp-ring rp-ring--${tone}`} style={{ width: `${size}px`, height: `${size}px`, '--rp-ring-size': `${size}px` }} role="img" aria-label={`${t.results.score}: ${score} ${t.results.scoreOutOf}`}>
      <svg viewBox="0 0 84 84" width={size} height={size} aria-hidden="true">
        <circle class="rp-ring__track" cx="42" cy="42" r={r} fill="none" stroke-width="7" />
        <circle
          class="rp-ring__value"
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke-width="7"
          stroke-linecap="round"
          stroke-dasharray={c}
          stroke-dashoffset={c * (1 - score / 100)}
          transform="rotate(-90 42 42)"
        />
      </svg>
      <div class="rp-ring__text">
        <span class="rp-ring__num">{score}</span>
        <span class="rp-ring__of">{t.results.scoreOutOf}</span>
      </div>
    </div>
  );
}
