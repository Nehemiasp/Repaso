// Arma evals/reporte.md a partir de evals/results/*.json. Lo que no se ha medido queda marcado como pendiente.
import { writeFileSync } from 'node:fs';
import { formatUsd } from '../src/ai/pricing';
import type { CopyMetrics, NamesScore } from './metrics';
import { load } from './util';

interface Rules { fecha: string; limpio: { capas: number; hallazgos: number; puntaje: number; ids: string[] }; prueba: { capas: number; esperados: number; detectados: number; sobrantes: string[]; noVerificables: number; puntaje: number; reglasCubiertas: number }; textos: { hallazgosDeReglas: number } }
interface Perf { fecha: string; node: string; presupuestoMs: number; filas: { objetivo: number; capas: number; hallazgos: number; lecturaMs: number; reglasMs: number; totalMs: number; tramoMaxMs: number; cesiones: number }[] }
interface NamesAi { fecha: string; modelo: string; archivos: { archivo: string; capas: number; nombrados: number; lotesDescartados: number; gastoUsd: number }[]; gastoUsd: number; capas: number }
interface CopyAi { fecha: string; modelo: string; tono: string; corridas: CopyMetrics[]; gastoUsd: number }

const PENDIENTE = '**Pendiente: requiere clave de Anthropic.** No se ha ejecutado, así que no hay cifras: no se inventan.';
const pct = (n: number) => `${(n * 100).toFixed(0)} %`;
const rules = load<Rules>('rules');
const perf = load<Perf>('perf');
const names = load<NamesAi>('names-ai');
const score = load<NamesScore & { fecha: string }>('names-score');
const copy = load<CopyAi>('copy-ai');

const out: string[] = ['# Reporte de evaluación · Repaso', '', `Generado con \`npm run eval:report\` · ${new Date().toISOString().slice(0, 10)}`, ''];

out.push('## Estado', '', '| Evaluación | Estado |', '|---|---|');
out.push(`| 3. Reglas sin IA | ${rules ? (rules.limpio.hallazgos === 0 && rules.prueba.detectados === rules.prueba.esperados ? '✅ medida' : '⚠️ medida, con diferencias') : 'sin ejecutar'} |`);
out.push(`| 4. Rendimiento (2 000 capas) | ${perf ? '✅ medida con nodos simulados; falta medir en Figma' : 'sin ejecutar'} |`);
out.push(`| 1. Nombres de capa (IA) | ${names ? (score ? '✅ medida y calificada' : '🟡 generada; falta que usted la califique') : '⏳ pendiente (requiere clave)'} |`);
out.push(`| 2. Textos (IA) | ${copy ? '✅ medida' : '⏳ pendiente (requiere clave)'} |`, '');

out.push('## 3 · Reglas sin IA', '');
if (!rules) out.push('Sin ejecutar: `npm run eval:rules`.', '');
else {
  out.push(
    `- **Archivo limpio** (${rules.limpio.capas} capas): **${rules.limpio.hallazgos} hallazgos**, puntaje ${rules.limpio.puntaje}/100. ${rules.limpio.hallazgos === 0 ? 'Sin falsos positivos.' : `Revisar: ${rules.limpio.ids.join(', ')}.`}`,
    `- **Archivo con errores a propósito** (${rules.prueba.capas} capas): detectó **${rules.prueba.detectados} de ${rules.prueba.esperados}** esperados, con ${rules.prueba.sobrantes.length} sobrantes${rules.prueba.sobrantes.length ? ` (${rules.prueba.sobrantes.join(', ')})` : ''}; cubre ${rules.prueba.reglasCubiertas} de 9 reglas; ${rules.prueba.noVerificables} elemento «no verificado» (texto sobre imagen, nunca aprobado). Puntaje ${rules.prueba.puntaje}/100.`,
    `- **Textos con errores de IA**: las reglas sin IA dan ${rules.textos.hallazgosDeReglas} hallazgos (no se meten con la ortografía, como debe ser).`,
    '',
    '> Los fixtures son inventados por mí y los errores los puse yo: esto prueba que las reglas hacen lo que dicen, **no** que no den falsas alarmas en archivos reales. Para eso hace falta correr Repaso sobre un archivo limpio de verdad (sin material de clientes) y revisar lo que marque.',
    '',
  );
}

out.push('## 4 · Rendimiento', '');
if (!perf) out.push('Sin ejecutar: `npm run eval:perf`.', '');
else {
  out.push(`Lectura por partes + reglas, mediana de 5 corridas, Node ${perf.node}, presupuesto de ${perf.presupuestoMs} ms por tramo.`, '', '| Capas | Lectura | Reglas | Total | Tramo más largo sin ceder | Cesiones del hilo |', '|---:|---:|---:|---:|---:|---:|');
  for (const f of perf.filas) out.push(`| ${f.capas.toLocaleString('es')} | ${f.lecturaMs} ms | ${f.reglasMs} ms | ${f.totalMs} ms | ${f.tramoMaxMs} ms | ${f.cesiones} |`);
  const f2k = perf.filas.find((f) => f.objetivo === 2000);
  out.push(
    '',
    f2k ? `**2 000 capas: ${f2k.totalMs} ms en total; el tramo más largo sin ceder el hilo fue de ${f2k.tramoMaxMs} ms** (un cuadro a 60 fps dura ~16 ms).` : '',
    '',
    '> **Alcance real de esta medición:** son nodos simulados en Node. En Figma, cada lectura de una propiedad cruza al editor y cuesta mucho más, así que el tiempo total será **mayor**, no menor. Lo que esta medición sí demuestra es que el código **cede el hilo cada ~8 ms** sin importar el tamaño. Falta comprobar en Figma que mover el lienzo durante una revisión de 2 000 capas sigue fluido (`docs/verificacion-manual.md`) y registrar el tiempo real aquí.',
    '',
  );
}

out.push('## 1 · Nombres de capa con IA', '');
if (!names) out.push(PENDIENTE, '', 'Para ejecutarla:', '', '```bash', 'ANTHROPIC_API_KEY=sk-ant-… npm run eval:names      # genera evals/names-tabla.md', '# califique la última columna: 1 malo · 2 aceptable · 3 bueno', 'npm run eval:names -- --score evals/names-tabla.md', 'npm run eval:report', '```', '', 'Antes puede ver el costo estimado sin gastar: `npm run eval:names -- --dry` (≈ 80 capas en 3 archivos, menos de 0,01 USD con el modelo económico).', '');
else {
  out.push(`Modelo \`${names.modelo}\` · ${names.capas} capas en 3 archivos · gasto ${formatUsd(names.gastoUsd)}.`, '', '| Archivo | Capas | Nombradas | Lotes descartados |', '|---|---:|---:|---:|');
  for (const a of names.archivos) out.push(`| ${a.archivo} | ${a.capas} | ${a.nombrados} | ${a.lotesDescartados} |`);
  out.push('');
  if (!score) out.push('🟡 Falta su calificación: abra `evals/names-tabla.md`, califique de 1 a 3 y ejecute `npm run eval:names -- --score evals/names-tabla.md`.', '');
  else out.push(`**Calificados ${score.rated}** (pendientes ${score.pending}): malos ${score.bad} · aceptables ${score.acceptable} · buenos ${score.good}.`, '', `**→ ${score.acceptableOrGoodPct.toFixed(0)} % aceptables o buenos** · ${score.goodPct.toFixed(0)} % buenos · promedio ${score.average.toFixed(2)} / 3.`, '');
}

out.push('## 2 · Textos con IA', '');
if (!copy) out.push(PENDIENTE, '', 'Para ejecutarla (7 errores insertados: 3 de ortografía, 2 de tuteo, 2 de mayúsculas):', '', '```bash', 'ANTHROPIC_API_KEY=sk-ant-… npm run eval:copy -- --runs 3', 'npm run eval:report', '```', '');
else {
  out.push(`Modelo \`${copy.modelo}\` · trato «${copy.tono}» · ${copy.corridas.length} corrida(s) · gasto ${formatUsd(copy.gastoUsd)}.`, '', '| Corrida | Detectó | Tipo correcto | Corrección esperada | Falsas alarmas | Precisión |', '|---:|---:|---:|---:|---:|---:|');
  copy.corridas.forEach((m, i) => out.push(`| ${i + 1} | ${m.detected}/${m.expected} (${pct(m.recall)}) | ${m.detectedRightKind} | ${m.detectedRightFix} | ${m.falseAlarms} | ${pct(m.precision)} |`));
  out.push('');
}

out.push('## Cómo leer este reporte', '', '- Las cifras salen de `evals/results/*.json`; el reporte se regenera con `npm run eval:report`.', '- Nada se estima a ojo: si una medición no se ejecutó, dice «pendiente».', '- Con 7 errores insertados, un solo error cambia el recall en 14 puntos: use `--runs 3` y mire también las falsas alarmas antes de concluir.', '');
writeFileSync('evals/reporte.md', out.join('\n'));
console.log('Escrito evals/reporte.md');
