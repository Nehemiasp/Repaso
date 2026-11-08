import type { DocNode, Paint, Rgb } from '../../shared/types';
import { toHex } from '../color';
import { fmt } from '../format';
import { nearestColor } from '../nearest';
import { makeFinding, type Rule, type RuleContext } from './types';

/** Un ΔE2000 menor a esto se considera el mismo color: se ofrece aplicar el estilo tal cual. */
export const SAME_COLOR_DELTA = 0.5;

type Solid = Extract<Paint, { kind: 'solid' }>;

/** Rellenos sólidos visibles sin estilo ni variable. */
function unboundSolids(node: DocNode, ctx: RuleContext): Solid[] {
  if (node.inInstance) return [];
  return node.fills.filter(
    (f): f is Solid => f.kind === 'solid' && f.visible && !f.styleId && !f.variableId,
  );
}

function pick(node: DocNode, ctx: RuleContext) {
  const fills = unboundSolids(node, ctx);
  if (fills.length === 0) return null;
  // Se audita el relleno visible más alto: es el que se ve.
  const top: Solid = fills[fills.length - 1]!;
  return { color: top.color as Rgb, near: nearestColor(top.color, ctx.catalog) };
}

const metaNoStyle = { id: 'fill-no-style', category: 'styles', severity: 'medium' } as const;
const metaNear = { id: 'color-near-style', category: 'styles', severity: 'low' } as const;

export const fillNoStyleRule: Rule = {
  ...metaNoStyle,
  checkNode(node, ctx) {
    const p = pick(node, ctx);
    if (!p) return [];
    const { near } = p;
    const exact = near && near.deltaE < SAME_COLOR_DELTA;
    // Los «casi iguales» los reporta color-near-style: así no se duplica el aviso.
    if (near && !exact && near.deltaE <= ctx.settings.colorTolerance) return [];
    return [
      makeFinding(metaNoStyle, node, {
        message: `Color ${toHex(p.color)} sin estilo ni variable`,
        ...(exact
          ? {
              detail: `Es el mismo color que «${near.style.name}».`,
              fix: {
                kind: 'apply-color' as const,
                styleId: near.style.id,
                styleName: near.style.name,
                source: near.style.source,
                deltaE: near.deltaE,
              },
            }
          : {}),
      }),
    ];
  },
};

export const colorNearStyleRule: Rule = {
  ...metaNear,
  checkNode(node, ctx) {
    const p = pick(node, ctx);
    if (!p || !p.near) return [];
    const { near } = p;
    if (near.deltaE < SAME_COLOR_DELTA || near.deltaE > ctx.settings.colorTolerance) return [];
    return [
      makeFinding(metaNear, node, {
        message: `Color ${toHex(p.color)} casi igual a «${near.style.name}»`,
        detail: `Diferencia de color ΔE ${fmt(near.deltaE, 1)}; se ve casi igual pero no lo es.`,
        fix: {
          kind: 'apply-color',
          styleId: near.style.id,
          styleName: near.style.name,
          source: near.style.source,
          deltaE: near.deltaE,
        },
      }),
    ];
  },
};
