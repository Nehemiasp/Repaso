import type { Category, DocNode, Finding, RuleId, Scene, Settings, Severity, StyleCatalog } from '../../shared/types';

export interface RuleContext {
  scene: Scene;
  catalog: StyleCatalog;
  settings: Settings;
}

export interface Rule {
  id: RuleId;
  category: Category;
  /** Severidad habitual; una regla puede subirla o bajarla por hallazgo. */
  severity: Severity;
  checkNode(node: DocNode, ctx: RuleContext): Finding[];
}

export function makeFinding(
  rule: Pick<Rule, 'id' | 'category' | 'severity'>,
  node: DocNode,
  extra: Pick<Finding, 'message'> & Partial<Pick<Finding, 'detail' | 'status' | 'fix' | 'severity'>>,
): Finding {
  return {
    id: `${rule.id}:${node.id}`,
    ruleId: rule.id,
    category: rule.category,
    severity: extra.severity ?? rule.severity,
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    message: extra.message,
    status: extra.status ?? 'fail',
    ...(extra.detail !== undefined ? { detail: extra.detail } : {}),
    ...(extra.fix !== undefined ? { fix: extra.fix } : {}),
  };
}
