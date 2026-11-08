import { nearestTextStyle } from '../nearest';
import { clip } from '../format';
import { makeFinding, type Rule } from './types';

const meta = { id: 'text-no-style', category: 'styles', severity: 'medium' } as const;

export const textNoStyleRule: Rule = {
  ...meta,
  checkNode(node, { catalog }) {
    if (node.type !== 'TEXT' || !node.text || node.inInstance) return [];
    if (node.text.textStyleId) return [];
    const near = nearestTextStyle(node.text, catalog);
    return [
      makeFinding(meta, node, {
        message: `Texto sin estilo de texto («${clip(node.text.characters, 24)}»)`,
        ...(near
          ? {
              detail: `Se parece a «${near.name}».`,
              fix: { kind: 'apply-text-style' as const, styleId: near.id, styleName: near.name },
            }
          : {}),
      }),
    ];
  },
};
