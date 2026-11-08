// Protocolo entre el hilo principal (plugin) y la interfaz (iframe).
import type { ReviewResult } from '../engine/run';
import type { Finding, Settings } from './types';

export type Scope = 'selection' | 'page';

export type ErrorKind =
  | 'no-selection'
  | 'empty-selection'
  | 'too-large'
  | 'ai-key-invalid'
  | 'ai-no-credit'
  | 'ai-offline'
  | 'ai-rate-limit'
  | 'unknown';

export type Phase = 'reading' | 'checking' | 'ai';

export interface ReviewMeta {
  scope: Scope;
  nodeCount: number;
  durationMs: number;
  /** Marca de tiempo (ms). */
  at: number;
}

/** Lo que se guarda en el archivo de la última revisión para el resumen de Inicio. */
export interface LastSummary {
  score: number;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  scope: Scope;
  nodeCount: number;
  at: number;
}

export interface ReviewPayload {
  /** Todos los hallazgos, incluidos los ignorados: la interfaz filtra con `ignoredIds`. */
  findings: Finding[];
  ignoredIds: string[];
  meta: ReviewMeta;
  aiSummary?: string;
  /** Aviso no fatal sobre la IA (tope de costo alcanzado, lote descartado…). */
  aiNotice?: string;
}

export type FixKindGroup = 'apply-color' | 'apply-text-style' | 'snap-spacing' | 'rename';

export interface FixPreviewItem {
  findingId: string;
  nodeId: string;
  nodeName: string;
  before: string;
  after: string;
  /** Origen del nombre propuesto en renombres. */
  source?: 'ai' | 'type';
}

export interface FixPreview {
  kind: FixKindGroup;
  items: FixPreviewItem[];
}

export interface InitPayload {
  settings: Settings;
  hasApiKey: boolean;
  /** Últimos 4 caracteres de la clave, para mostrar «••••1234». */
  keyHint?: string;
  firstRun: boolean;
  selectionCount: number;
  last: LastSummary | null;
  ignoredCount: number;
  size: { width: number; height: number };
  version: string;
}

export type ToUi =
  | { type: 'init'; payload: InitPayload }
  | { type: 'selection'; count: number }
  | { type: 'progress'; phase: Phase; done: number; total: number }
  | { type: 'result'; payload: ReviewPayload }
  | { type: 'error'; kind: ErrorKind; detail?: string; count?: number }
  | { type: 'fix-preview'; preview: FixPreview }
  | { type: 'fix-applied'; kind: FixKindGroup; applied: number; skipped: number; fixedIds: string[] }
  | { type: 'cancelled' }
  | { type: 'ignored'; ids: string[] }
  | { type: 'key-check'; ok: boolean; kind?: ErrorKind; detail?: string }
  | { type: 'settings'; settings: Settings; hasApiKey: boolean; keyHint?: string };

export type ToPlugin =
  | { type: 'ready' }
  | { type: 'review'; scope: Scope }
  | { type: 'cancel' }
  | { type: 'select-node'; nodeId: string }
  | { type: 'ignore'; ids: string[] }
  | { type: 'unignore'; ids: string[] }
  | { type: 'clear-ignored' }
  | { type: 'save-settings'; settings: Settings }
  | { type: 'save-key'; key: string }
  | { type: 'clear-key' }
  | { type: 'check-key'; key?: string }
  | { type: 'dismiss-welcome' }
  | { type: 'request-fix-preview'; kind: FixKindGroup; findingIds: string[] }
  | { type: 'apply-fixes'; kind: FixKindGroup; findingIds: string[] }
  | { type: 'resize'; width: number; height: number }
  | { type: 'notify'; message: string };
