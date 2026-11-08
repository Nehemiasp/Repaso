import { describe, expect, it } from 'vitest';
import { weightFromStyle } from './fontWeight';

describe('weightFromStyle', () => {
  it.each([
    ['Regular', 400], ['Italic', 400], ['Thin', 100], ['Extra Light', 200], ['Light', 300], ['Medium', 500],
    ['Semi Bold', 600], ['SemiBold', 600], ['Bold', 700], ['Extra Bold', 800], ['Black', 900], ['Bold Italic', 700],
  ])('%s → %i', (style, w) => expect(weightFromStyle(style)).toBe(w));
});
