# Reporte de evaluación · Repaso

Generado con `npm run eval:report` · 2026-11-08

## Estado

| Evaluación | Estado |
|---|---|
| 3. Reglas sin IA | ✅ medida |
| 4. Rendimiento (2 000 capas) | ✅ medida con nodos simulados; falta medir en Figma |
| 1. Nombres de capa (IA) | ⏳ pendiente (requiere clave) |
| 2. Textos (IA) | ⏳ pendiente (requiere clave) |

## 3 · Reglas sin IA

- **Archivo limpio** (7 capas): **0 hallazgos**, puntaje 100/100. Sin falsos positivos.
- **Archivo con errores a propósito** (23 capas): detectó **11 de 11** esperados, con 0 sobrantes; cubre 9 de 9 reglas; 1 elemento «no verificado» (texto sobre imagen, nunca aprobado). Puntaje 68/100.
- **Textos con errores de IA**: las reglas sin IA dan 0 hallazgos (no se meten con la ortografía, como debe ser).

> Los fixtures son inventados por mí y los errores los puse yo: esto prueba que las reglas hacen lo que dicen, **no** que no den falsas alarmas en archivos reales. Para eso hace falta correr Repaso sobre un archivo limpio de verdad (sin material de clientes) y revisar lo que marque.

## 4 · Rendimiento

Lectura por partes + reglas, mediana de 5 corridas, Node v22.23.4, presupuesto de 8 ms por tramo.

| Capas | Lectura | Reglas | Total | Tramo más largo sin ceder | Cesiones del hilo |
|---:|---:|---:|---:|---:|---:|
| 500 | 2 ms | 4 ms | 6 ms | 0 ms | 0 |
| 2000 | 7 ms | 12 ms | 17 ms | 8 ms | 1 |
| 5000 | 18 ms | 22 ms | 40 ms | 8.4 ms | 4 |
| 20.000 | 48 ms | 85 ms | 134 ms | 14.6 ms | 12 |

**2 000 capas: 17 ms en total; el tramo más largo sin ceder el hilo fue de 8 ms** (un cuadro a 60 fps dura ~16 ms).

> **Alcance real de esta medición:** son nodos simulados en Node. En Figma, cada lectura de una propiedad cruza al editor y cuesta mucho más, así que el tiempo total será **mayor**, no menor. Lo que esta medición sí demuestra es que el código **cede el hilo cada ~8 ms** sin importar el tamaño. Falta comprobar en Figma que mover el lienzo durante una revisión de 2 000 capas sigue fluido (`docs/verificacion-manual.md`) y registrar el tiempo real aquí.

## 1 · Nombres de capa con IA

**Pendiente: requiere clave de Anthropic.** No se ha ejecutado, así que no hay cifras: no se inventan.

Para ejecutarla:

```bash
ANTHROPIC_API_KEY=sk-ant-… npm run eval:names      # genera evals/names-tabla.md
# califique la última columna: 1 malo · 2 aceptable · 3 bueno
npm run eval:names -- --score evals/names-tabla.md
npm run eval:report
```

Antes puede ver el costo estimado sin gastar: `npm run eval:names -- --dry` (≈ 80 capas en 3 archivos, menos de 0,01 USD con el modelo económico).

## 2 · Textos con IA

**Pendiente: requiere clave de Anthropic.** No se ha ejecutado, así que no hay cifras: no se inventan.

Para ejecutarla (7 errores insertados: 3 de ortografía, 2 de tuteo, 2 de mayúsculas):

```bash
ANTHROPIC_API_KEY=sk-ant-… npm run eval:copy -- --runs 3
npm run eval:report
```

## Cómo leer este reporte

- Las cifras salen de `evals/results/*.json`; el reporte se regenera con `npm run eval:report`.
- Nada se estima a ojo: si una medición no se ejecutó, dice «pendiente».
- Con 7 errores insertados, un solo error cambia el recall en 14 puntos: use `--runs 3` y mire también las falsas alarmas antes de concluir.
