import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, fromHex } from '../src/engine/color';

const css = readFileSync(new URL('../src/ui/styles/tokens.css', import.meta.url), 'utf8');
const block = (sel: string) => {
  const start = css.indexOf(`${sel} {`);
  return css.slice(start, css.indexOf('\n}', start));
};
const vars = (b: string) => Object.fromEntries([...b.matchAll(/(--rp-[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1]!, m[2]!]));

// Fondos de Figma por tema (valores de respaldo de tokens.css).
const THEMES = {
  claro: { vars: vars(block(':root')), bg: '#ffffff', raised: '#f5f5f5', text: '#1a1a1a' },
  oscuro: { vars: { ...vars(block(':root')), ...vars(block('.figma-dark')) }, bg: '#2c2c2c', raised: '#383838', text: '#ffffff' },
} as const;

const ratio = (a: string, b: string) => contrastRatio(fromHex(a), fromHex(b));

describe.each(Object.entries(THEMES))('contraste AA de los tokens · tema %s', (_name, th) => {
  const v = th.vars as Record<string, string>;
  it.each(['critical', 'high', 'medium', 'low', 'unverified'])('severidad %s sobre su fondo y sobre el fondo de Figma', (s) => {
    expect(ratio(v[`--rp-sev-${s}`]!, v[`--rp-sev-${s}-bg`]!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v[`--rp-sev-${s}`]!, th.bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['success', 'warning', 'danger', 'info'])('estado %s', (s) => {
    expect(ratio(v[`--rp-${s}`]!, v[`--rp-${s}-bg`]!)).toBeGreaterThanOrEqual(4.5);
  });
  it('botón primario: texto sobre acento', () => {
    expect(ratio(v['--rp-on-accent']!, v['--rp-accent']!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v['--rp-on-accent']!, v['--rp-accent-hover']!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v['--rp-on-accent']!, v['--rp-accent-pressed']!)).toBeGreaterThanOrEqual(4.5);
  });
  it('acento como texto/enlace y su versión suave', () => {
    expect(ratio(v['--rp-accent']!, th.bg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v['--rp-accent-subtle-text']!, v['--rp-accent-subtle']!)).toBeGreaterThanOrEqual(4.5);
  });
  it('texto secundario sobre el fondo y sobre el fondo elevado', () => {
    expect(ratio(v['--rp-text-secondary']!, th.bg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v['--rp-text-secondary']!, th.raised)).toBeGreaterThanOrEqual(4.5);
  });
  it('anillo de foco visible (3:1) sobre el fondo', () => {
    expect(ratio(v['--rp-focus']!, th.bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('tipografía de la propia interfaz', () => {
  it('nunca baja de 12 px (la misma regla que Repaso exige a los diseños)', () => {
    const sizes = [...css.matchAll(/--rp-text-\w+:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
  });
});
