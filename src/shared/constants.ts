import type { RuleId, Settings, Severity } from './types';

export const APP_VERSION = '0.1.0';
export const AUTHOR = { name: 'Nehemias Pérez', url: 'https://nehemiasperez.com' };

/** Puntos que resta cada hallazgo, por severidad. */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

/** Tope de puntos que una sola regla puede restar: 500 capas sin nombre no hunden todo. */
export const RULE_PENALTY_CAP = 25;

/** Más capas que esto → «archivo demasiado grande». */
export const MAX_NODES = 20000;

export const RULE_IDS: RuleId[] = [
  'contrast',
  'text-small',
  'touch-target',
  'layer-default-name',
  'fill-no-style',
  'color-near-style',
  'text-no-style',
  'spacing-off-scale',
  'component-missing-states',
];

export const DEFAULT_MODEL = 'claude-haiku-5-5';

export const DEFAULT_SETTINGS: Settings = {
  rules: Object.fromEntries(RULE_IDS.map((id) => [id, true])) as Record<RuleId, boolean>,
  minTextSize: 12,
  minTouchTarget: 44,
  spacingGrid: 4,
  contrastLevel: 'AA',
  colorTolerance: 4,
  ignoreHidden: true,
  tone: 'usted',
  aiEnabled: false,
  model: DEFAULT_MODEL,
  aiBudgetUsd: 0.25,
};
