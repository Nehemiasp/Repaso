import { describe, expect, it, vi } from 'vitest';
import { catalog, frame, node, rect, scene, settings, solid, text } from '../../tests/builders';
import { orderedNodes, runRules, runRulesAsync } from './run';
import { computeScore, countByCategory, countBySeverity } from './score';
import type { Finding } from '../shared/types';

const sample = () =>
  scene(
    frame('root', { name: 'Pantalla', fills: [solid('#FFFFFF')] }, [
      text('t1', 'Muy gris', { fills: [solid('#CCCCCC')], fontSize: 9 }),
      rect('r1', { name: 'Rectangle 7', fills: [solid('#FF8800')] }),
      frame('oculto', { name: 'Frame 9', visible: false }),
    ]),
  );

describe('orderedNodes', () => {
  it('recorre en profundidad y tolera hijos ausentes', () => {
    const s = scene(frame('a', {}, [frame('b', {}, [rect('c')]), rect('d')]));
    s.nodes.a!.children.push('fantasma');
    expect(orderedNodes(s).map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('runRules', () => {
  it('junta hallazgos de todas las reglas y calcula puntaje', () => {
    const r = runRules(sample(), catalog(), settings());
    const ids = r.findings.map((f) => f.id).sort();
    expect(ids).toEqual(
      ['contrast:t1', 'fill-no-style:r1', 'fill-no-style:root', 'fill-no-style:t1', 'layer-default-name:r1', 'text-no-style:t1', 'text-small:t1'].sort(),
    );
    expect(r.nodeCount).toBe(4);
    expect(r.score.score).toBeLessThan(100);
    expect(r.bySeverity.critical).toBe(1);
    expect(r.byCategory.accessibility).toBe(2);
    expect(r.unverifiable).toBe(0);
  });
  it('omite capas ocultas salvo que se pida lo contrario', () => {
    expect(runRules(sample(), catalog(), settings()).findings.some((f) => f.nodeId === 'oculto')).toBe(false);
    expect(runRules(sample(), catalog(), settings({ ignoreHidden: false })).findings.some((f) => f.nodeId === 'oculto')).toBe(true);
  });
  it('reglas desactivadas no corren', () => {
    const r = runRules(sample(), catalog(), settings({ rules: { contrast: false, 'text-small': false } as never }));
    expect(r.findings.some((f) => f.ruleId === 'contrast' || f.ruleId === 'text-small')).toBe(false);
  });
  it('los ignorados salen del resultado y del puntaje', () => {
    const base = runRules(sample(), catalog(), settings());
    const r = runRules(sample(), catalog(), settings(), new Set(['contrast:t1']));
    expect(r.ignored).toBe(1);
    expect(r.findings).toHaveLength(base.findings.length - 1);
    expect(r.score.score).toBeGreaterThan(base.score.score);
  });
  it('cuenta los no verificables', () => {
    const s = scene(frame('f', {}, [text('t', 'x', { textStyleId: 'S:1', fills: [solid('#000000')] })]));
    const r = runRules(s, catalog(), settings());
    expect(r.unverifiable).toBe(1);
  });
  it('un archivo limpio no tiene hallazgos y puntúa 100', () => {
    const s = scene(frame('f', { name: 'Pantalla', fills: [solid('#FFFFFF', 1, { styleId: 'S:1' })] }, [text('t', 'Hola', { fills: [solid('#000000', 1, { styleId: 'S:2' })], textStyleId: 'S:3' })]));
    const r = runRules(s, catalog(), settings());
    expect(r.findings).toEqual([]);
    expect(r.score.score).toBe(100);
  });
});

describe('runRulesAsync', () => {
  it('da el mismo resultado que la versión síncrona', async () => {
    const a = await runRulesAsync(sample(), catalog(), settings());
    expect(a).toEqual(runRules(sample(), catalog(), settings()));
  });
  it('cede el hilo cuando se acaba el presupuesto y reporta progreso', async () => {
    let t = 0;
    const yieldFn = vi.fn(async () => {});
    const onProgress = vi.fn();
    const r = await runRulesAsync(sample(), catalog(), settings(), { budgetMs: 5, now: () => (t += 3), yieldFn, onProgress });
    expect(r).not.toBeNull();
    expect(yieldFn).toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith(4, 4);
  });
  it('se puede cancelar a mitad de camino', async () => {
    const signal = { cancelled: false };
    let t = 0;
    const r = await runRulesAsync(sample(), catalog(), settings(), {
      budgetMs: 1,
      now: () => (t += 2),
      yieldFn: async () => {
        signal.cancelled = true;
      },
      signal,
    });
    expect(r).toBeNull();
  });
  it('cancelar justo al final también devuelve null', async () => {
    const signal = { cancelled: true };
    const r = await runRulesAsync(scene(rect('a', { name: 'a' })), catalog(), settings(), { budgetMs: 1e9, signal });
    expect(r).toBeNull();
  });
  it('con presupuesto 0 cede de verdad el hilo (yield por defecto)', async () => {
    const r = await runRulesAsync(sample(), catalog(), settings(), { budgetMs: 0 });
    expect(r!.nodeCount).toBe(4);
  });
  it('acepta ignorados', async () => {
    const r = await runRulesAsync(sample(), catalog(), settings(), { ignored: new Set(['contrast:t1']) });
    expect(r!.ignored).toBe(1);
  });
});

describe('puntaje explicable', () => {
  const f = (ruleId: Finding['ruleId'], severity: Finding['severity'], n = 1): Finding[] =>
    Array.from({ length: n }, (_, i) => ({ id: `${ruleId}:${i}:${severity}`, ruleId, category: 'order', severity, nodeId: String(i), nodeName: '', nodeType: 'FRAME', message: '', status: 'fail' }));
  it('sin hallazgos = 100', () => {
    expect(computeScore([])).toEqual({ score: 100, penalty: 0, breakdown: [] });
  });
  it('resta 10/5/2/1 por severidad', () => {
    expect(computeScore(f('contrast', 'critical')).score).toBe(90);
    expect(computeScore(f('contrast', 'high')).score).toBe(95);
    expect(computeScore(f('text-small', 'medium')).score).toBe(98);
    expect(computeScore(f('layer-default-name', 'low')).score).toBe(99);
  });
  it('cada regla tiene un tope de 25 puntos', () => {
    const r = computeScore(f('layer-default-name', 'low', 500));
    expect(r.score).toBe(75);
    expect(r.breakdown[0]).toEqual({ ruleId: 'layer-default-name', count: 500, penalty: 25, capped: true });
  });
  it('el desglose va de mayor a menor y el mínimo es 0', () => {
    const many = [...f('contrast', 'critical', 10), ...f('fill-no-style', 'critical', 10), ...f('text-small', 'critical', 10), ...f('touch-target', 'critical', 10), ...f('spacing-off-scale', 'medium', 3)];
    const r = computeScore(many);
    expect(r.score).toBe(0);
    expect(r.breakdown[r.breakdown.length - 1]!.ruleId).toBe('spacing-off-scale');
    expect(r.breakdown[r.breakdown.length - 1]!.capped).toBe(false);
  });
  it('cuenta por severidad y categoría', () => {
    const fs = f('contrast', 'high', 2);
    expect(countBySeverity(fs)).toEqual({ critical: 0, high: 2, medium: 0, low: 0 });
    expect(countByCategory(fs).order).toBe(2);
  });
});

void node;
