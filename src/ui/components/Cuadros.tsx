import './Cuadros.css';

export interface CuadrosProps {
  /** mini = 3×3 para el encabezado; full = rejilla completa para bienvenida, vacío y «Acerca de». */
  variant?: 'mini' | 'full';
  size?: number;
}

// Patrón del motivo: 1 = cuadro lleno, 0.5 = tenue, 0 = vacío. Cada cuadro es una decisión revisada.
const MINI = [
  [1, 1, 0.5],
  [1, 0.5, 0],
  [0.5, 0, 0],
];
const FULL = [
  [1, 1, 1, 1, 0.5, 0.5, 0],
  [1, 1, 1, 0.5, 0.5, 0, 0],
  [1, 1, 0.5, 0.5, 0, 0, 0],
  [1, 0.5, 0.5, 0, 0, 0, 0],
];

/** Motivo de cuadros mini: la marca personal, con discreción. */
export function Cuadros({ variant = 'mini', size }: CuadrosProps) {
  const grid = variant === 'mini' ? MINI : FULL;
  const cols = grid[0]!.length;
  const rows = grid.length;
  const cell = 10;
  const gap = 3;
  const w = cols * cell + (cols - 1) * gap;
  const h = rows * cell + (rows - 1) * gap;
  const px = size ?? (variant === 'mini' ? 18 : 112);
  return (
    <svg class={`rp-cuadros rp-cuadros--${variant}`} width={px} height={(px * h) / w} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      {grid.flatMap((row, r) =>
        row.map((v, c) =>
          v === 0 ? null : <rect key={`${r}-${c}`} x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} rx="1.5" fill="currentColor" opacity={v} />,
        ),
      )}
    </svg>
  );
}
