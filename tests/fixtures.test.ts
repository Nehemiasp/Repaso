import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runRules } from '../src/engine';
import type { Scene, Settings, StyleCatalog } from '../src/shared/types';
import { settings } from './builders';

const load = <T>(f: string): T => JSON.parse(readFileSync(new URL(`../fixtures/${f}`, import.meta.url), 'utf8')) as T;
interface Fx { catalog: StyleCatalog; scene: Scene; expectedFindings?: string[] }
const run = (fx: Fx, s: Settings = settings()) => runRules(fx.scene, fx.catalog, s);

describe('archivo de prueba (errores a propósito)', () => {
  const fx = load<Fx>('archivo-prueba.json');
  const result = run(fx);
  it('el motor detecta exactamente los errores esperados, ni más ni menos', () => {
    expect(result.findings.map((f) => f.id).sort()).toEqual(fx.expectedFindings);
  });
  it('cubre las 9 reglas', () => {
    const rules = new Set(result.findings.map((f) => f.ruleId));
    expect([...rules].sort()).toEqual(
      ['color-near-style', 'component-missing-states', 'contrast', 'fill-no-style', 'layer-default-name', 'spacing-off-scale', 'text-no-style', 'text-small', 'touch-target'].sort(),
    );
  });
  it('lo que está sobre una imagen se marca «no verificable», no aprobado', () => {
    const f = result.findings.find((x) => x.id === 'contrast:e01b-texto')!;
    expect(f.status).toBe('unverifiable');
    expect(result.unverifiable).toBe(1);
  });
  it('las correcciones sugeridas son las esperadas', () => {
    const byId = Object.fromEntries(result.findings.map((f) => [f.id, f]));
    expect(byId['color-near-style:e06-rect']!.fix).toMatchObject({ styleName: 'Marca/Azul' });
    expect(byId['text-no-style:e07-texto']!.fix).toMatchObject({ styleName: 'Cuerpo' });
    expect(byId['spacing-off-scale:e08']!.fix).toMatchObject({ changes: [{ prop: 'gap', from: 13, to: 12 }, { prop: 'padT', from: 10, to: 12 }] });
    expect(byId['layer-default-name:e04-frame']!.fix).toMatchObject({ suggested: 'Fila' });
    expect(byId['layer-default-name:e04-rect']!.fix).toMatchObject({ suggested: 'Rectángulo' });
  });
  it('el puntaje baja pero no es 0', () => {
    expect(result.score.score).toBeGreaterThan(0);
    expect(result.score.score).toBeLessThan(90);
  });
});

describe('archivo limpio', () => {
  it('no tiene hallazgos', () => {
    const fx = load<Fx>('archivo-limpio.json');
    const r = run(fx);
    expect(r.findings).toEqual([]);
    expect(r.score.score).toBe(100);
  });
});

describe('textos con errores (para la IA)', () => {
  it('las reglas sin IA no se meten con los textos', () => {
    const fx = load<Fx>('textos-con-errores.json');
    expect(run(fx).findings).toEqual([]);
  });
});
