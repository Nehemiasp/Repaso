import { describe, expect, it } from 'vitest';
import { clip, fmt } from './format';

describe('format', () => {
  it('usa coma decimal', () => {
    expect(fmt(4.5, 1)).toBe('4,5');
    expect(fmt(12)).toBe('12');
  });
  it('recorta textos largos', () => {
    expect(clip('hola', 10)).toBe('hola');
    expect(clip('abcdefghij', 5)).toBe('abcd…');
    expect(clip('x'.repeat(41))).toHaveLength(40);
  });
});
