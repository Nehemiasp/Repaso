// Formato de datos que lee el motor. Todo es JSON simple y serializable:
// el motor nunca ve objetos de la API de Figma.

export interface Rgb {
  /** 0..1 */
  r: number;
  g: number;
  b: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Paint =
  | {
      kind: 'solid';
      color: Rgb;
      /** Opacidad del relleno, 0..1. */
      opacity: number;
      visible: boolean;
      styleId?: string;
      variableId?: string;
    }
  | { kind: 'gradient'; opacity: number; visible: boolean; styleId?: string }
  | { kind: 'image'; opacity: number; visible: boolean };

export type NodeType =
  | 'FRAME'
  | 'GROUP'
  | 'SECTION'
  | 'TEXT'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'POLYGON'
  | 'STAR'
  | 'VECTOR'
  | 'LINE'
  | 'BOOLEAN_OPERATION'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'OTHER';

export interface TextInfo {
  characters: string;
  fontSize: number;
  fontFamily: string;
  /** 100..900 */
  fontWeight: number;
  textStyleId?: string;
  /** El texto mezcla tamaños o estilos; se lee el primer tramo. */
  mixed?: boolean;
}

export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';

export interface LayoutInfo {
  mode: LayoutMode;
  gap: number;
  /** El espacio entre elementos es automático (space-between): no se audita. */
  gapAuto?: boolean;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
}

export type ComponentKind = 'component' | 'set' | 'instance';

export interface ComponentInfo {
  kind: ComponentKind;
  /** Propiedades de una instancia: nombre → valor. */
  props?: Record<string, string | boolean>;
  /** Propiedades de variante de un set: nombre → opciones. */
  variantOptions?: Record<string, string[]>;
  /** Nombre del componente principal (instancias). */
  mainName?: string;
}

export interface DocNode {
  id: string;
  parentId: string | null;
  type: NodeType;
  name: string;
  visible: boolean;
  /** Opacidad del nodo, 0..1. */
  opacity: number;
  box: Box;
  fills: Paint[];
  hasStroke?: boolean;
  radius?: number;
  text?: TextInfo;
  layout?: LayoutInfo;
  component?: ComponentInfo;
  /** El nodo está dentro de una instancia (sus estilos vienen del componente). */
  inInstance?: boolean;
  /** Ids de los hijos, de abajo hacia arriba en el orden de apilado (como Figma). */
  children: string[];
}

export interface Scene {
  /** Nodos desde donde empieza el alcance (selección o hijos de la página). */
  rootIds: string[];
  nodes: Record<string, DocNode>;
}

export interface ColorStyleInfo {
  id: string;
  name: string;
  color: Rgb;
  /** 'style' = estilo de color; 'variable' = variable de color. */
  source: 'style' | 'variable';
}

export interface TextStyleInfo {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
}

export interface StyleCatalog {
  colors: ColorStyleInfo[];
  texts: TextStyleInfo[];
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];

export type Category =
  | 'accessibility'
  | 'order'
  | 'styles'
  | 'spacing'
  | 'components'
  | 'texts';
export const CATEGORIES: Category[] = [
  'accessibility',
  'order',
  'styles',
  'spacing',
  'components',
  'texts',
];

export type RuleId =
  | 'contrast'
  | 'text-small'
  | 'touch-target'
  | 'layer-default-name'
  | 'fill-no-style'
  | 'color-near-style'
  | 'text-no-style'
  | 'spacing-off-scale'
  | 'component-missing-states';

export type FixKind = 'apply-color' | 'apply-text-style' | 'snap-spacing' | 'rename';

/** Datos que cada tipo de corrección necesita para aplicarse. */
export type FixData =
  | { kind: 'apply-color'; styleId: string; styleName: string; source: 'style' | 'variable'; deltaE: number }
  | { kind: 'apply-text-style'; styleId: string; styleName: string }
  | { kind: 'snap-spacing'; changes: SpacingChange[] }
  | { kind: 'rename'; suggested: string };

export type SpacingProp = 'gap' | 'padL' | 'padR' | 'padT' | 'padB';
export interface SpacingChange {
  prop: SpacingProp;
  from: number;
  to: number;
}

export interface Finding {
  /** Estable entre revisiones: `${ruleId}:${nodeId}`. */
  id: string;
  ruleId: RuleId;
  category: Category;
  severity: Severity;
  nodeId: string;
  nodeName: string;
  /** Texto corto en español. */
  message: string;
  /** Explicación opcional (valores medidos, umbrales). */
  detail?: string;
  /** 'unverifiable' = no se pudo comprobar; nunca cuenta como aprobado. */
  status: 'fail' | 'unverifiable';
  fix?: FixData;
}

export type ContrastLevel = 'AA' | 'AAA';
export type Tone = 'usted' | 'tu';

export interface Settings {
  rules: Record<RuleId, boolean>;
  minTextSize: number;
  minTouchTarget: number;
  /** Rejilla de espaciado en px. */
  spacingGrid: number;
  contrastLevel: ContrastLevel;
  /** ΔE2000 máximo para considerar un color «casi igual» a un estilo. */
  colorTolerance: number;
  ignoreHidden: boolean;
  tone: Tone;
  aiEnabled: boolean;
  model: string;
  /** Tope de gasto estimado por revisión con IA, en USD. */
  aiBudgetUsd: number;
}
