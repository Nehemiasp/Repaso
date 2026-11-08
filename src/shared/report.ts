// Reporte en Markdown para pegar en una tarea o en Notion. Función pura.
import { buildResult } from '../engine/run';
import { CATEGORIES, SEVERITIES, type Finding } from './types';
import type { ReviewMeta } from './messages';

const SEVERITY: Record<string, string> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };
const MARK: Record<string, string> = { critical: '⛔', high: '🔶', medium: '🔸', low: '▫️' };
const CATEGORY: Record<string, string> = {
  accessibility: 'Accesibilidad',
  order: 'Orden',
  styles: 'Estilos',
  spacing: 'Espaciado',
  components: 'Componentes',
  texts: 'Textos',
};

export interface ReportInput {
  findings: Finding[];
  ignoredIds: string[];
  meta: ReviewMeta;
  aiSummary?: string;
  fileName?: string;
  includeIgnored?: boolean;
  includeDetail?: boolean;
}

const esc = (s: string) => s.replace(/([\\`*_{}[\]<>|])/g, '\\$1').replace(/\r?\n/g, ' ');

/** La severidad siempre va con texto, además del símbolo: nunca solo color o ícono. */
function line(f: Finding, detail: boolean): string {
  const tag = f.status === 'unverifiable' ? 'No verificado' : SEVERITY[f.severity];
  const parts = [`- ${MARK[f.severity]} **${tag}** · ${esc(f.message)} — capa «${esc(f.nodeName)}»`];
  if (detail && f.detail) parts.push(`  - ${esc(f.detail)}`);
  if (f.fix?.kind === 'rename') parts.push(`  - Nombre sugerido: ${esc(f.fix.suggested)}`);
  return parts.join('\n');
}

export function buildReport(input: ReportInput): string {
  const { findings, ignoredIds, meta, aiSummary, fileName, includeIgnored = false, includeDetail = true } = input;
  const ignored = new Set(ignoredIds);
  const result = buildResult(findings, meta.nodeCount, ignored);
  const shown = includeIgnored ? findings : result.findings;
  const date = new Date(meta.at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
  const out: string[] = [];
  out.push(`# Reporte de Repaso${fileName ? ` · ${esc(fileName)}` : ''}`);
  out.push('');
  out.push(`${date} · ${meta.scope === 'page' ? 'Página actual' : 'Selección'} · ${meta.nodeCount.toLocaleString('es')} capas revisadas`);
  out.push('');
  out.push(`**Puntaje: ${result.score.score}/100**`);
  out.push('');
  out.push(
    SEVERITIES.map((s) => `${SEVERITY[s]}: ${result.bySeverity[s]}`).join(' · ') +
      (result.unverifiable ? ` · No verificados: ${result.unverifiable}` : ''),
  );
  if (aiSummary) {
    out.push('');
    out.push('## Resumen');
    out.push('');
    out.push(`> ${esc(aiSummary)}`);
  }
  if (result.score.breakdown.length) {
    out.push('');
    out.push('## Cómo se calculó el puntaje');
    out.push('');
    out.push('| Regla | Hallazgos | Puntos restados |');
    out.push('|---|---:|---:|');
    for (const b of result.score.breakdown) out.push(`| ${b.ruleId} | ${b.count} | −${b.penalty}${b.capped ? ' (tope)' : ''} |`);
  }
  if (shown.length === 0) {
    out.push('');
    out.push('Sin hallazgos. Todo en orden.');
  }
  for (const c of CATEGORIES) {
    const list = shown.filter((f) => f.category === c);
    if (!list.length) continue;
    out.push('');
    out.push(`## ${CATEGORY[c]} (${list.length})`);
    out.push('');
    const rank = (f: Finding) => SEVERITIES.indexOf(f.severity);
    for (const f of [...list].sort((a, b) => rank(a) - rank(b))) {
      out.push(line(f, includeDetail) + (ignored.has(f.id) ? ' _(ignorado)_' : ''));
    }
  }
  out.push('');
  out.push('---');
  out.push('_Generado con Repaso · nehemiasperez.com_');
  out.push('');
  return out.join('\n');
}
