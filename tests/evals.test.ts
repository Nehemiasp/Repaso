import { describe, expect, it } from 'vitest';
import { runRules } from '../src/engine';
import type { Finding } from '../src/shared/types';
import { catalog, settings } from './builders';
import { scoreCopy, scoreNamesTable } from '../evals/metrics';
import { EVAL_FILES } from '../evals/scenes';

const ai = (id: string, ruleId: Finding['ruleId'], message: string): Finding => ({ id: `${ruleId}:${id}`, ruleId, category: 'texts', severity: 'low', nodeId: id, nodeName: id, nodeType: 'TEXT', message, status: 'fail' });

describe('métricas de textos', () => {
  const expected = [
    { nodeId: 'a', kind: 'spelling' as const, suggested: 'Contraseña inválida' },
    { nodeId: 'b', kind: 'case' as const, suggested: 'Cancelar' },
    { nodeId: 'c', kind: 'tone' as const, suggested: 'Ingrese su nombre' },
  ];
  it('cuenta detectados, tipo, corrección y falsas alarmas', () => {
    const m = scoreCopy(expected, [
      ai('a', 'ai-spelling', 'Ortografía: «Contraseña inválda» → «Contraseña inválida»'),
      ai('b', 'ai-tone', 'Trato: «CANCELAR» → «Cancelar»'),
      ai('z', 'ai-spelling', 'Ortografía: «Hola» → «Holá»'),
    ]);
    expect(m).toMatchObject({ expected: 3, detected: 2, detectedRightKind: 1, detectedRightFix: 2, falseAlarms: 1, reported: 3, missed: ['c'], falseAlarmIds: ['ai-spelling:z'] });
    expect(m.recall).toBeCloseTo(2 / 3);
    expect(m.precision).toBeCloseTo(2 / 3);
  });
  it('casos vacíos', () => {
    expect(scoreCopy([], [])).toMatchObject({ recall: 1, precision: 1 });
    expect(scoreCopy(expected, [])).toMatchObject({ recall: 0, precision: 1, missed: ['a', 'b', 'c'] });
  });
  it('ignora hallazgos de reglas (no son de la IA)', () => {
    expect(scoreCopy(expected, [{ ...ai('a', 'contrast', 'x') }]).reported).toBe(0);
  });
});

describe('tabla de calificación de nombres', () => {
  const md = `| # | Archivo | Capa | Estructura | Por tipo | IA | Calif. (1-3) |
|---|---|---|---|---|---|---|
| 1 | A | Frame 1 | x | Fila | Tarjeta / Producto | 3 |
| 2 | A | Frame 2 | x | Fila | Contenedor | 2 |
| 3 | A | Frame 3 | x | Fila | Cosa | 1 |
| 4 | A | Frame 4 | x | Fila | Botón / Relleno |  |
| 5 | A | Frame 5 | x | Fila | Ícono | 3 |
`;
  it('calcula % aceptables o buenos solo sobre lo calificado', () => {
    const s = scoreNamesTable(md);
    expect(s).toMatchObject({ rated: 4, pending: 1, bad: 1, acceptable: 1, good: 2 });
    expect(s.acceptableOrGoodPct).toBe(75);
    expect(s.goodPct).toBe(50);
    expect(s.average).toBe(2.25);
  });
  it('tabla vacía', () => {
    expect(scoreNamesTable('').rated).toBe(0);
    expect(scoreNamesTable('').acceptableOrGoodPct).toBe(0);
  });
});

describe('archivos de evaluación de nombres', () => {
  it('son 3, con capas por defecto suficientes y sin otros hallazgos de «sin nombre» ausentes', () => {
    expect(EVAL_FILES).toHaveLength(3);
    for (const f of EVAL_FILES) {
      const r = runRules(f.scene(), catalog(), settings());
      const nameless = r.findings.filter((x) => x.ruleId === 'layer-default-name');
      expect(nameless.length, f.id).toBeGreaterThanOrEqual(15);
    }
  });
});
