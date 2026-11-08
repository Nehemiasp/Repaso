import { describe, expect, it } from 'vitest';
import { catalog } from '../../tests/builders';
import { fromHex } from './color';
import { nearestColor, nearestTextStyle, textDistance } from './nearest';

describe('nearestColor', () => {
  it('catálogo vacío → null', () => {
    expect(nearestColor(fromHex('#FFFFFF'), catalog())).toBeNull();
  });
  it('elige el más cercano', () => {
    const c = catalog({ colors: [['Rojo', '#FF0000'], ['Azul', '#043565']] });
    const r = nearestColor(fromHex('#053666'), c)!;
    expect(r.style.name).toBe('Azul');
    expect(r.deltaE).toBeLessThan(1);
  });
  it('en empate gana la variable sobre el estilo', () => {
    const c = catalog({ colors: [['Estilo', '#043565', 'style'], ['Variable', '#043565', 'variable']] });
    expect(nearestColor(fromHex('#043565'), c)!.style.name).toBe('Variable');
    // Y si la variable va primero, también.
    const c2 = catalog({ colors: [['Variable', '#043565', 'variable'], ['Estilo', '#043565', 'style']] });
    expect(nearestColor(fromHex('#043565'), c2)!.style.name).toBe('Variable');
  });
});

describe('nearestTextStyle', () => {
  const c = catalog({ texts: [['Cuerpo', 'Inter', 16, 400], ['Título', 'Inter', 32, 700], ['Serif', 'Georgia', 16, 400]] });
  it('misma familia y tamaño', () => {
    expect(nearestTextStyle({ fontFamily: 'Inter', fontSize: 16, fontWeight: 400 }, c)!.name).toBe('Cuerpo');
  });
  it('el más parecido dentro del límite', () => {
    expect(nearestTextStyle({ fontFamily: 'Inter', fontSize: 15, fontWeight: 400 }, c)!.name).toBe('Cuerpo');
    expect(nearestTextStyle({ fontFamily: 'Georgia', fontSize: 17, fontWeight: 400 }, c)!.name).toBe('Serif');
  });
  it('no fuerza un estilo lejano', () => {
    expect(nearestTextStyle({ fontFamily: 'Inter', fontSize: 64, fontWeight: 400 }, c)).toBeNull();
  });
  it('catálogo vacío → null', () => {
    expect(nearestTextStyle({ fontFamily: 'Inter', fontSize: 16, fontWeight: 400 }, catalog())).toBeNull();
  });
  it('distancia: familia 3, px 1, peso 0,5 por 100', () => {
    expect(textDistance({ fontFamily: 'A', fontSize: 10, fontWeight: 400 }, { fontFamily: 'B', fontSize: 12, fontWeight: 600 })).toBe(3 + 2 + 1);
  });
});
