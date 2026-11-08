# RETOQUES · Dónde tocar cada cosa

Guía para que usted retoque lo visual sin buscar. Para ver todo: `npm run preview` (galería en http://localhost:5173, no necesita Figma). Cada marco de la galería es una pantalla o estado real, con datos de ejemplo del motor.

## Flujo de trabajo
1. `npm run preview` y edite. La galería recarga sola. Además, `http://localhost:5173/demo.html` es la **interfaz real conectada a un plugin simulado** (revisar → lote → exportar funcionan de verdad; `?ai=1` con IA, `?theme=dark`).
2. Colores, tamaños, radios, espaciados: **solo en `src/ui/styles/tokens.css`**.
3. Forma de un componente: su `.css` junto al `.tsx` en `src/ui/components/`.
4. Distribución de una pantalla: `src/ui/screens/Screens.css` (una sección comentada por pantalla).
5. Textos (microcopy): **todo en `src/ui/i18n/es.ts`**.
6. Antes de entregar: `npm test` (verifica contraste AA de los tokens y que no haya colores escritos en los `.tsx`) y `npm run check:gallery` (desbordes, teclado y foco en 3 tamaños, 42 pantallas).
6b. Capturas «después» para el caso de estudio: `npm run screenshots -- --out docs/assets/despues <ids>`; ícono y portada: `node scripts/make-assets.mjs` (fuentes en `docs/assets/src/`).
7. Para ver el resultado en Figma: `npm run build` y recargue el plugin (ver `CLAUDE.md`).

## Pantallas (id de la galería → archivo)
| # | Pantalla | Estados en la galería | Archivo |
|---|---|---|---|
| 1 | Bienvenida | `welcome` | `screens/Welcome.tsx` |
| 2 | Inicio | `home-last`, `home-new` (sin selección), `home-page`, `home-nokey` | `screens/Home.tsx` |
| 3 | Revisando | `reviewing-start`, `-checking`, `-ai`, `-cancelling` | `screens/Reviewing.tsx` |
| 3 | Estimado antes de usar la IA | `ai-estimate`, `ai-estimate-over` (supera el tope) | `screens/AiEstimate.tsx` |
| 4 | Resultados | `results-testfile`, `results-200`, `results-long` (nombres larguísimos), `results-single` (una categoría), `results-unverified`, `results-ai` (notas, textos y resumen de la IA), `results-ignored` | `screens/Results.tsx` |
| 4 | Lote con vista previa | `batch-rename` (34), `batch-color`, `batch-spacing`, `batch-loading`, `batch-applying`, `batch-applied` | `components/BatchSheet.tsx` |
| 5 | Sin problemas | `clean`, `clean-ignored` | `Results.tsx` (`CleanView`) |
| 6 | Errores | `error-no-selection`, `-empty-selection`, `-ai-key-invalid`, `-ai-no-credit`, `-ai-offline`, `-ai-rate-limit`, `-too-large`, `-unknown` | `screens/ErrorScreen.tsx` + textos en `i18n/es.ts` (`ERRORS`) |
| 7 | Ajustes | `settings`, `settings-ai`, `settings-key-error`, `settings-checking` | `screens/Settings.tsx` |
| 8 | Exportar | `export`, `export-empty` | `screens/Export.tsx` |
| 9 | Acerca de | `about` | `screens/About.tsx` |
| — | Todos los componentes | `components` | `preview/entries.tsx` |

Para una sola pantalla: `http://localhost:5173/?only=results-200&theme=dark&size=320x440`.

## Componentes (`src/ui/components/`)
| Componente | Archivos | Notas |
|---|---|---|
| Botón / Botón de ícono | `Button.tsx/.css` | variantes `primary`, `secondary`, `ghost`, `danger`; tamaños `sm`, `md`, `lg`; `loading` |
| Fila de hallazgo | `FindingRow.tsx/.css` | el cuerpo es un botón (selecciona y hace zoom); Corregir e Ignorar son botones hermanos; la nota de la IA va en un recuadro con ✦ |
| Etiqueta de severidad | `SeverityBadge.tsx/.css` | silueta distinta por severidad + palabra: nunca solo color |
| Interruptor | `Switch.tsx/.css` | `role="switch"` |
| Campo, campo numérico, selector | `Field.tsx/.css` | clave con mostrar/ocultar |
| Aviso | `Notice.tsx/.css` | `info`, `success`, `warning`, `error` |
| Estado vacío | `EmptyState.tsx/.css` | también lo usan los errores |
| Pestañas | `Tabs.tsx/.css` | flechas, Inicio y Fin |
| Segmentado, casilla | `Segmented.tsx`, `Checkbox.tsx` | |
| Hoja de lote | `BatchSheet.tsx/.css`, `Sheet.tsx/.css` | atrapa el foco; Esc cierra |
| Puntaje, progreso, spinner | `ScoreRing`, `ProgressBar`, `Spinner` | el tamaño del número escala con el anillo |
| Motivo de cuadros | `Cuadros.tsx` | `mini` (encabezado) y `full` (bienvenida, vacío, Acerca de). El patrón es una matriz editable al inicio del archivo |
| Íconos | `Icon.tsx` | 53 íconos propios, trazo 1,75; agregue uno en el objeto `ICONS` |
| Encabezado, pantalla, aviso breve, plegable, asa | `Header`, `Screen`, `Toast`, `Disclosure`, `ResizeHandle` | |

## Decisiones visuales
- **Nativo en Figma**: fondos, bordes y texto principal vienen de `--figma-color-*` (`themeColors: true`); claro y oscuro salen solos. Mi marca solo aparece en el acento (`#043565` / `#8DB6E8` en oscuro), el motivo de cuadros (encabezado, bienvenida, vacío, Acerca de) y la ilustración vacía.
- **Contraste verificado, no supuesto**: el texto secundario de Figma no llega a 4,5:1 sobre su fondo, así que `--rp-text-secondary` es propio (`#595959` / `#B8B8B8`). `tests/tokens.test.ts` falla si algún par (severidades, estados, botón primario, secundario, foco) baja de AA.
- **La severidad nunca es solo color**: cuatro siluetas (octágono, triángulo, rombo, círculo) + la palabra (Crítica, Alta, Media, Baja) + el color. «No verificado» tiene su propio ícono y gris.
- **Nada de texto bajo 12 px**, la misma regla que Repaso exige a los diseños.
- **Jerarquía de la fila de hallazgo**: severidad y categoría arriba, descripción en negrita, capa afectada como etiqueta con ícono del tipo de nodo, detalle en gris al final. Los nombres largos se recortan con «…» y el nombre completo está en `title`.
- **Resultados en 560 px de alto**: pestañas fijas, resumen plegable (el desglose del puntaje está detrás de «¿Por qué este puntaje?»), correcciones en lote en una fila que se desplaza, y la lista se muestra de 50 en 50.
- **Corregir siempre con vista previa**, incluso una sola capa: abre la hoja con antes → después y casillas.
- **Movimiento sutil**: entradas de 200 ms (`--rp-duration`), todo se apaga con `prefers-reduced-motion`.
- **Foco visible** en todo (anillo doble de 2 px sobre el fondo, color de acento); `Tabs`, `Segmented` y la hoja de lote se manejan con flechas / Esc.
- **Tamaño**: 360 × 560, con asa en la esquina inferior derecha (y flechas con el foco) hasta 640 × 900; se recuerda entre sesiones.

## Cosas que quizá quiera cambiar y dónde
| Quiero… | Toque… |
|---|---|
| Otro azul de marca | `--rp-accent` (y variantes) en `tokens.css`, claro y `.figma-dark` |
| Más aire en las filas | `--rp-row-min` y `--rp-space-*` |
| Esquinas más redondas | `--rp-radius-*` |
| Cambiar el motivo de cuadros | matrices `MINI` y `FULL` en `Cuadros.tsx` |
| Cambiar un texto | `i18n/es.ts` |
| Otro orden de pestañas | `CATEGORIES` en `src/shared/types.ts` |

## Versión sin IA
`npm run build:community` quita del paquete todo el código de IA y la red. En esa versión la interfaz oculta los ajustes de trato, IA y clave, el chip de IA y la tercera línea de la bienvenida (se reemplaza por su variante local, en `i18n/es.ts`: `linesLocal`, `privacyItemsLocal`). Si retoca esas pantallas, retoque también esas variantes.

## Límites conocidos
- **Inter** se pide por nombre; Figma la tiene instalada en el equipo pero el iframe del plugin no la incrusta. Si falta, cae a la fuente del sistema. Incrustarla (woff2 en base64) sube ~100 KB al HTML.
- El tamaño real de las ventanas de plugin lo maneja Figma; el asa llama a `figma.ui.resize`.
- La galería imita las variables de Figma en `preview/figma-theme.css`; los valores reales pueden variar levemente.
