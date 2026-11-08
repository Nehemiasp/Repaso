import { describe, expect, it } from 'vitest';
import { blend, contrastRatio, deltaE2000, fromHex, luminance, toHex, toLab } from './color';

describe('color', () => {
  it('convierte hex ↔ rgb', () => {
    expect(toHex(fromHex('#043565'))).toBe('#043565');
    expect(toHex(fromHex('8db6e8'))).toBe('#8DB6E8');
    expect(toHex({ r: 2, g: -1, b: 0.5 })).toBe('#FF0080');
  });
  it('rechaza hex inválido', () => {
    expect(() => fromHex('azul')).toThrow('Color inválido');
  });
  it('compone con opacidad', () => {
    expect(toHex(blend(fromHex('#000000'), 0.5, fromHex('#FFFFFF')))).toBe('#808080');
    expect(toHex(blend(fromHex('#FF0000'), 2, fromHex('#FFFFFF')))).toBe('#FF0000');
  });
  it('calcula luminancia y contraste WCAG', () => {
    expect(luminance(fromHex('#FFFFFF'))).toBeCloseTo(1, 5);
    expect(luminance(fromHex('#000000'))).toBe(0);
    expect(contrastRatio(fromHex('#000000'), fromHex('#FFFFFF'))).toBeCloseTo(21, 5);
    // Es simétrico.
    expect(contrastRatio(fromHex('#FFFFFF'), fromHex('#000000'))).toBeCloseTo(21, 5);
    // Referencia conocida: #767676 sobre blanco ≈ 4,54:1.
    expect(contrastRatio(fromHex('#767676'), fromHex('#FFFFFF'))).toBeCloseTo(4.54, 2);
  });
  it('Lab: negro y blanco', () => {
    expect(toLab(fromHex('#000000'))[0]).toBeCloseTo(0, 3);
    expect(toLab(fromHex('#FFFFFF'))[0]).toBeCloseTo(100, 1);
    // Rama lineal de f() con colores muy oscuros.
    expect(toLab({ r: 0.001, g: 0.001, b: 0.001 })[0]).toBeGreaterThan(0);
  });
  it('ΔE2000: idéntico = 0 y simétrico', () => {
    const a = fromHex('#043565');
    expect(deltaE2000(a, a)).toBe(0);
    const b = fromHex('#0A3A6B');
    expect(deltaE2000(a, b)).toBeCloseTo(deltaE2000(b, a), 6);
    expect(deltaE2000(a, b)).toBeGreaterThan(0);
    expect(deltaE2000(a, b)).toBeLessThan(5);
  });
  // Pares de referencia de Sharma et al. (2005), convertidos aproximadamente: se verifica orden de magnitud.
  it('ΔE2000: colores muy distintos dan valores grandes', () => {
    expect(deltaE2000(fromHex('#000000'), fromHex('#FFFFFF'))).toBeCloseTo(100, 0);
    expect(deltaE2000(fromHex('#FF0000'), fromHex('#00FF00'))).toBeGreaterThan(70);
  });
  it('ΔE2000: grises (croma 0) y cruce de matiz', () => {
    expect(deltaE2000(fromHex('#808080'), fromHex('#888888'))).toBeGreaterThan(0);
    // Un croma cero y el otro no.
    expect(deltaE2000(fromHex('#808080'), fromHex('#FF0000'))).toBeGreaterThan(30);
    // Matices a ambos lados del cero (rojizo y magenta): diferencia de matiz > 180 y suma < 360.
    expect(deltaE2000(fromHex('#FF3B30'), fromHex('#FF2D9B'))).toBeGreaterThan(0);
    // Matices con diferencia > 180 y suma ≥ 360.
    expect(deltaE2000(fromHex('#00C8C8'), fromHex('#FF2D55'))).toBeGreaterThan(0);
    // Diferencia de matiz < -180 (orden inverso).
    expect(deltaE2000(fromHex('#FF2D9B'), fromHex('#FF3B30'))).toBeGreaterThan(0);
    expect(deltaE2000(fromHex('#FF2D55'), fromHex('#00C8C8'))).toBeGreaterThan(0);
  });
});
