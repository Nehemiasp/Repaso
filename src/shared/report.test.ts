import { describe, expect, it } from 'vitest';
import { buildReport } from './report';
import type { Finding } from './types';

const f = (over: Partial<Finding>): Finding => ({
  id: 'x:1', ruleId: 'contrast', category: 'accessibility', severity: 'high', nodeId: '1', nodeName: 'Título', nodeType: 'TEXT', message: 'Contraste insuficiente (3,45:1)', status: 'fail', ...over,
});
const meta = { scope: 'selection' as const, nodeCount: 1234, durationMs: 50, at: Date.UTC(2026, 10, 8, 12) };

describe('buildReport', () => {
  it('incluye puntaje, severidades con texto y capa afectada', () => {
    const md = buildReport({ findings: [f({}), f({ id: 'y:1', ruleId: 'layer-default-name', category: 'order', severity: 'low', message: 'Capa sin nombre', nodeName: 'Frame 1', fix: { kind: 'rename', suggested: 'Fila' } })], ignoredIds: [], meta, fileName: 'Mi archivo' });
    expect(md).toContain('# Reporte de Repaso · Mi archivo');
    expect(md).toContain('**Puntaje: 94/100**');
    expect(md).toContain('Crítica: 0 · Alta: 1 · Media: 0 · Baja: 1');
    expect(md).toContain('**Alta** · Contraste insuficiente (3,45:1) — capa «Título»');
    expect(md).toContain('Nombre sugerido: Fila');
    expect(md).toContain('## Accesibilidad (1)');
    expect(md).toContain('## Orden (1)');
    expect(md).toContain('| contrast | 1 | −5 |');
  });
  it('marca los no verificados con texto', () => {
    const md = buildReport({ findings: [f({ status: 'unverifiable', severity: 'low' })], ignoredIds: [], meta });
    expect(md).toContain('**No verificado**');
    expect(md).toContain('No verificados: 1');
  });
  it('sin hallazgos', () => {
    const md = buildReport({ findings: [], ignoredIds: [], meta });
    expect(md).toContain('Sin hallazgos. Todo en orden.');
    expect(md).toContain('**Puntaje: 100/100**');
    expect(md).not.toContain('Cómo se calculó');
  });
  it('resumen de IA y detalles opcionales', () => {
    const base = { findings: [f({ detail: 'Nivel AA pide 4,5:1.' })], ignoredIds: [], meta, aiSummary: 'Buen avance.' };
    expect(buildReport(base)).toContain('> Buen avance.');
    expect(buildReport(base)).toContain('Nivel AA pide 4,5:1.');
    expect(buildReport({ ...base, includeDetail: false })).not.toContain('Nivel AA pide');
  });
  it('los ignorados no cuentan, salvo que se pida incluirlos (y entonces se rotulan)', () => {
    const base = { findings: [f({})], ignoredIds: ['x:1'], meta };
    expect(buildReport(base)).toContain('Sin hallazgos');
    const md = buildReport({ ...base, includeIgnored: true });
    expect(md).toContain('_(ignorado)_');
  });
  it('escapa caracteres de Markdown y saltos de línea en nombres', () => {
    const md = buildReport({ findings: [f({ nodeName: 'a|b*c\nd' })], ignoredIds: [], meta });
    expect(md).toContain('«a\\|b\\*c d»');
  });
  it('indica página completa y marca el tope', () => {
    const many = Array.from({ length: 6 }, (_, i) => f({ id: `c:${i}`, severity: 'critical' }));
    const md = buildReport({ findings: many, ignoredIds: [], meta: { ...meta, scope: 'page' } });
    expect(md).toContain('Página actual');
    expect(md).toContain('(tope)');
  });
});
