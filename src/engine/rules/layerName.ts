import { isDefaultName, suggestNameByType } from '../naming';
import { makeFinding, type Rule } from './types';

const meta = { id: 'layer-default-name', category: 'order', severity: 'low' } as const;

export const layerNameRule: Rule = {
  ...meta,
  checkNode(node, { scene }) {
    if (node.type === 'TEXT' || node.type === 'INSTANCE' || node.inInstance) return [];
    if (!isDefaultName(node.name)) return [];
    return [
      makeFinding(meta, node, {
        message: `Capa sin nombre («${node.name}»)`,
        fix: { kind: 'rename', suggested: suggestNameByType(node, scene) },
      }),
    ];
  },
};
