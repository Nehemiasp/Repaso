import { describe, expect, it } from 'vitest';
import { box, node, scene } from '../../tests/builders';
import { effectiveName, hasStateKey, isFieldName, isInteractive, isInteractiveName } from './interactive';

describe('interactive', () => {
  it.each(['Button / Primary', 'Botón principal', 'btn-cta', 'Campo de correo', 'Text field', 'Enlace', 'Icon button', 'Checkbox', 'Tab', 'Pestaña activa', 'Switch', 'Chip'])('«%s» es interactivo', (n) => {
    expect(isInteractiveName(n)).toBe(true);
  });
  it.each(['Tarjeta', 'Tabla', 'Table', 'Buttons grid', 'Linkedin', 'Fondo'])('«%s» no es interactivo', (n) => {
    expect(isInteractiveName(n)).toBe(false);
  });
  it('reconoce campos', () => {
    expect(isFieldName('Input / Email')).toBe(true);
    expect(isFieldName('Botón')).toBe(false);
  });
  it('hasStateKey', () => {
    expect(hasStateKey(['Size', 'State'])).toBe(true);
    expect(hasStateKey(['Estado'])).toBe(true);
    expect(hasStateKey(['Size'])).toBe(false);
  });
  it('isInteractive por nombre, props o variantes', () => {
    const s = scene(
      node('a', 'INSTANCE', { name: 'Botón' }),
      node('b', 'INSTANCE', { name: 'Tarjeta', component: { kind: 'instance', props: { State: 'Hover' } } }),
      node('c', 'INSTANCE', { name: 'Tarjeta', component: { kind: 'instance' } }),
      node('d', 'COMPONENT_SET', { name: 'Tarjeta', component: { kind: 'set', variantOptions: { Estado: ['A'] } } }),
    );
    expect(isInteractive(s.nodes.a!, s)).toBe(true);
    expect(isInteractive(s.nodes.b!, s)).toBe(true);
    expect(isInteractive(s.nodes.c!, s)).toBe(false);
    expect(isInteractive(s.nodes.d!, s)).toBe(true);
  });
  it('usa el nombre del set para sus variantes', () => {
    const s = scene(
      node('set', 'COMPONENT_SET', { name: 'Botón', box: box(10, 10) }, [node('v', 'COMPONENT', { name: 'State=Hover' })]),
      node('lone', 'COMPONENT', { name: 'Suelto' }),
    );
    expect(effectiveName(s.nodes.v!, s)).toBe('Botón');
    expect(isInteractive(s.nodes.v!, s)).toBe(true);
    expect(effectiveName(s.nodes.lone!, s)).toBe('Suelto');
    // Variante cuyo padre no existe en la escena.
    const orphan = { ...s.nodes.v!, parentId: 'nada' };
    expect(effectiveName(orphan, s)).toBe('State=Hover');
  });
});
