import { isFieldName, isInteractiveName } from '../interactive';
import { makeFinding, type Rule } from './types';

const meta = { id: 'component-missing-states', category: 'components', severity: 'high' } as const;

const STATE_PROP = /^(state|estado|status)$/i;

interface StateDef {
  label: string;
  match: RegExp;
}

const HOVER: StateDef = { label: 'hover', match: /hover|sobre|over/i };
const FOCUS: StateDef = { label: 'foco', match: /focus|foco|enfocado/i };
const DISABLED: StateDef = { label: 'deshabilitado', match: /disabled|deshabilit|inactiv/i };
const ERROR: StateDef = { label: 'error', match: /error|invalid|inv[aá]lido/i };

export const componentStatesRule: Rule = {
  ...meta,
  checkNode(node) {
    if (node.type !== 'COMPONENT_SET' || !node.component?.variantOptions) return [];
    const options = node.component.variantOptions;
    const entry = Object.entries(options).find(([k]) => STATE_PROP.test(k));
    const interactive = isInteractiveName(node.name);

    if (!entry) {
      if (!interactive) return [];
      return [
        makeFinding(meta, node, {
          message: 'Componente interactivo sin propiedad de estado',
          detail: 'Agregue una propiedad «Estado» con hover, foco y deshabilitado.',
        }),
      ];
    }

    const present = entry[1];
    const required = isFieldName(node.name) ? [HOVER, FOCUS, DISABLED, ERROR] : [HOVER, FOCUS, DISABLED];
    const missing = required.filter((s) => !present.some((p) => s.match.test(p))).map((s) => s.label);
    if (missing.length === 0) return [];
    return [
      makeFinding(meta, node, {
        severity: missing.length >= 2 ? 'high' : 'medium',
        message: `Faltan estados: ${missing.join(', ')}`,
        detail: `Tiene: ${present.join(', ') || 'ninguno'}.`,
      }),
    ];
  },
};
