import { describe, expect, it } from 'vitest';
import { isOnGrid, nearestOnGrid, spacingChanges } from './spacing';

const L = { mode: 'VERTICAL' as const, gap: 8, padL: 16, padR: 16, padT: 12, padB: 12 };

describe('spacing', () => {
  it('valor más cercano de la escala', () => {
    expect(nearestOnGrid(13, 4)).toBe(12);
    expect(nearestOnGrid(15, 8)).toBe(16);
    expect(nearestOnGrid(6, 4)).toBe(8); // empate: sube
    expect(nearestOnGrid(0, 8)).toBe(0);
  });
  it('detecta lo que está en la escala', () => {
    expect(isOnGrid(24, 8)).toBe(true);
    expect(isOnGrid(12, 8)).toBe(false);
    expect(isOnGrid(0, 8)).toBe(true);
  });
  it('lista cambios de gap y padding', () => {
    expect(spacingChanges(L, 4)).toEqual([]);
    expect(spacingChanges({ ...L, gap: 13, padT: 5 }, 4)).toEqual([
      { prop: 'gap', from: 13, to: 12 },
      { prop: 'padT', from: 5, to: 4 },
    ]);
  });
  it('ignora gap automático y capas sin auto layout', () => {
    expect(spacingChanges({ ...L, gap: 13, gapAuto: true }, 4)).toEqual([]);
    expect(spacingChanges({ ...L, mode: 'NONE', gap: 13 }, 4)).toEqual([]);
  });
});
