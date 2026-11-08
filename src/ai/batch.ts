import type { AiClient } from './client';
import type { Budget } from './budget';
import type { AiCache } from './cache';

export const BATCH_SIZE = { names: 40, states: 8, copy: 60 } as const;

export interface AiContext {
  client: AiClient;
  budget: Budget;
  cache: AiCache;
  signal: { cancelled: boolean };
  /** Se llama al terminar cada lote (con o sin éxito). */
  tick: () => void;
}

export interface StageResult<T> {
  value: T;
  /** Se alcanzó el tope de gasto y quedó trabajo sin hacer. */
  truncated: boolean;
  /** Lotes descartados por respuestas no válidas (tras el reintento). */
  failed: number;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
