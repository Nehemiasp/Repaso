import type { RuleId } from '../shared/types';
import { colorNearStyleRule, fillNoStyleRule } from './rules/colorStyles';
import { componentStatesRule } from './rules/componentStates';
import { contrastRule } from './rules/contrast';
import { layerNameRule } from './rules/layerName';
import { spacingRule } from './rules/spacing';
import { textNoStyleRule } from './rules/textStyle';
import { textSmallRule } from './rules/textSmall';
import { touchTargetRule } from './rules/touchTarget';
import type { Rule } from './rules/types';

/** Registro único: agregar una regla = agregarla aquí. */
export const RULES: Rule[] = [
  contrastRule,
  textSmallRule,
  touchTargetRule,
  layerNameRule,
  fillNoStyleRule,
  colorNearStyleRule,
  textNoStyleRule,
  spacingRule,
  componentStatesRule,
];

export const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r])) as Record<RuleId, Rule>;
