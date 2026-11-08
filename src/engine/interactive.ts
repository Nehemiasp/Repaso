import type { DocNode, Scene } from '../shared/types';

const WORD = '[\\p{L}\\p{N}]';

function wordRegex(words: string[]): RegExp {
  return new RegExp(`(?<!${WORD})(?:${words.join('|')})(?!${WORD})`, 'iu');
}

/** Nombres que indican un elemento interactivo: botón, campo, enlace, ícono clicable… */
const INTERACTIVE_NAME = wordRegex([
  'bot[oó]n',
  'button',
  'btn',
  'cta',
  'input',
  'campo',
  'field',
  'textfield',
  'enlace',
  'link',
  'checkbox',
  'casilla',
  'radio',
  'toggle',
  'switch',
  'interruptor',
  'tab',
  'pesta[ñn]a',
  'chip',
  'dropdown',
  'select',
  'icon[ -]?button',
]);

const FIELD_NAME = wordRegex(['input', 'campo', 'field', 'textfield', 'text field', 'textarea', 'select', 'dropdown']);

const STATE_KEY = /^(state|estado|disabled|deshabilitado|hover|pressed)$/i;

export function isInteractiveName(name: string): boolean {
  return INTERACTIVE_NAME.test(name);
}

export function isFieldName(name: string): boolean {
  return FIELD_NAME.test(name);
}

/** Nombre «efectivo»: las variantes de un set se llaman «State=Hover», se usa el del set. */
export function effectiveName(node: DocNode, scene: Scene): string {
  if (node.type === 'COMPONENT' && node.parentId) {
    const parent = scene.nodes[node.parentId];
    if (parent?.type === 'COMPONENT_SET') return parent.name;
  }
  return node.name;
}

export function hasStateKey(keys: Iterable<string>): boolean {
  for (const k of keys) if (STATE_KEY.test(k)) return true;
  return false;
}

export function isInteractive(node: DocNode, scene: Scene): boolean {
  if (isInteractiveName(effectiveName(node, scene))) return true;
  const keys = [
    ...Object.keys(node.component?.props ?? {}),
    ...Object.keys(node.component?.variantOptions ?? {}),
  ];
  return hasStateKey(keys);
}
