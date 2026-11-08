# Bitácora de errores

Material para historias del portafolio: cada error que apareció al construir Repaso, con lo que se veía, por qué pasó, cómo se arregló y qué enseña. Las capturas están en `docs/assets/errores/E00N-…/antes` y `…/despues`.

> **Honestidad sobre las capturas:** los errores E001 a E006 los detecté y corregí durante la construcción, pero en ese momento no guardé las imágenes. Para esta bitácora **reproduje cada error a propósito** (deshaciendo solo el arreglo, con el mismo código y los mismos datos) y capturé el «antes»; el «después» es el código actual. Desde ahora, cada error visible se captura **en el momento** (ver «Cómo se agrega uno»).

## Resumen
| # | Error | Cómo apareció | Lección en una línea |
|---|---|---|---|
| E001 | El marco de la galería salía gigante | Una captura de 827 × 1584 px en vez de 360 × 560 | Una actualización mayor de la librería cambió una regla silenciosa |
| E002 | «Ajustes» se desbordaba en 320 px | `npm run check:gallery` | Lo que cabe a 360 px no cabe a 320: probar el tamaño mínimo |
| E003 | Un nombre de capa largo rompía la fila | Al diseñar el caso de «nombres larguísimos» | Probar con datos feos antes de que lleguen |
| E004 | El «100» no cabía en el anillo | Captura del estado «Sin problemas» | El tamaño del texto debe depender del tamaño del contenedor |
| E005 | «Resultados» no mostraba ni un hallazgo | Captura de la pantalla a 560 px de alto | Una pantalla correcta de 800 px puede ser inútil en 560 |
| E006 | La hoja de lote abría con el foco pintado en «Cerrar» | Captura en tema oscuro | El foco inicial es una decisión de diseño, no un detalle |

---

## E001 · El marco de la galería salía gigante
**Se veía:** en vez de una ventana de plugin de 360 × 560 px, la captura medía 827 × 1584 px: el marco se estiraba a todo el contenido.
**Capturas:** `docs/assets/errores/E001-px-en-estilos/antes/…` → `despues/…`
**Causa:** pasé `style={{ width: 360, height: 560 }}` con números. Preact 11 **ya no agrega `px` a los números** en estilos (Preact 10 sí); el navegador ignoró el valor inválido y el marco quedó sin tamaño.
**Arreglo:** cadenas con unidad (`` `${w}px` ``) en la galería, el anillo de puntaje y el indicador de carga.
**Lección:** una versión mayor de una dependencia puede cambiar una regla que el compilador no vigila. Lo detectó una captura, no un error de consola.

## E002 · «Ajustes» se desbordaba en 320 px
**Se veía:** a 320 px de ancho (el mínimo de la ventana), los dos campos numéricos y los textos de ayuda se cortaban en el borde derecho.
**Capturas:** `E002-ajustes-se-desborda` (desplazada hasta «Umbrales», con `--scroll 780`).
**Causa:** las rejillas CSS usaban columnas `auto`, que crecen con su contenido en vez de respetar el ancho del contenedor; y los dos campos numéricos tenían dos columnas fijas.
**Arreglo:** `grid-template-columns: minmax(0, 1fr)` en los contenedores y `repeat(auto-fit, minmax(160px, 1fr))` para los campos.
**Lección:** `npm run check:gallery` mide el desborde horizontal de las 42 pantallas en 3 tamaños. A ojo, solo lo vi después de hacer scroll.

## E003 · Un nombre de capa largo rompía la fila
**Se veía:** la etiqueta de la capa («Sección de héroe / Contenedor principal con tarjetas de…») se salía de la pantalla en vez de cortarse con «…».
**Capturas:** `E003-nombre-largo-rompe-la-fila` (tema oscuro).
**Causa:** el hijo de una rejilla no puede encogerse por debajo de su contenido salvo que la columna sea `minmax(0, 1fr)`; el recorte con `text-overflow: ellipsis` nunca llegaba a actuar.
**Arreglo:** una línea de CSS en `FindingRow.css`.
**Lección:** por eso la galería incluye el caso «nombres de capa muy largos» desde el principio. Los datos reales son más feos que los de ejemplo.

## E004 · El «100» no cabía en el anillo
**Se veía:** en «Todo en orden», el número «100» pisaba el borde del anillo de 72 px y «de 100» quedaba encima del trazo.
**Capturas:** `E004-puntaje-100-no-cabe`.
**Causa:** el tamaño de letra del puntaje era fijo (28 px) y el anillo cambia de tamaño (84 px en Resultados, 72 px aquí).
**Arreglo:** el número escala con el anillo (`calc(var(--rp-ring-size) * 0.3)`).
**Lección:** un componente reutilizable tiene que sobrevivir a sus propios tamaños.

## E005 · «Resultados» no mostraba ni un hallazgo
**Se veía:** en 560 px de alto, el resumen, el aviso de «no verificado» y los botones de corrección en lote ocupaban toda la pantalla; la lista de hallazgos quedaba fuera de vista.
**Capturas:** `E005-resultados-sin-lista` (reconstrucción de la primera versión: botones en varias filas y aviso más largo).
**Causa:** diseñé la pantalla pensando en espacio de sobra; una ventana de plugin no lo tiene.
**Arreglo:** botones de lote en una sola fila con desplazamiento horizontal, resumen más compacto, aviso de una línea y el desglose del puntaje plegado en «¿Por qué este puntaje?».
**Lección:** el diseño de un plugin se decide en 360 × 560. Es la restricción, no un detalle de implementación.

## E006 · La hoja de lote abría con el foco pintado en «Cerrar»
**Se veía:** al abrir «Renombrar capas», el botón de cerrar aparecía con un anillo de foco, como si hubiera que cerrarlo primero.
**Capturas:** `E006-foco-en-cerrar` (tema oscuro).
**Causa:** al abrir un diálogo mandaba el foco al primer elemento enfocable, que es el botón de cerrar.
**Arreglo:** el foco va al propio diálogo (`tabIndex={-1}`), para que Tab llegue después a la primera casilla. El diálogo sigue atrapando el foco y Esc lo cierra.
**Lección:** dónde cae el foco al abrir algo es una decisión de accesibilidad con efecto visual.

---

## Errores sin captura (de código o de proceso)
Sirven igual como historias; no tienen imagen porque no se veían.
- **Mi prueba estaba mal, no el código.** Esperé que un vector de 16 × 40 se llamara «Ícono» y la regla (con razón) dijo «Vector»; al revés, esperé un hallazgo «sin estilo» que no existía porque el texto sí tenía estilo. *Lección:* cuando una prueba falla, primero se lee si la prueba tiene razón.
- **Una prueba que solo pasaba en Linux.** `tests/build.test.ts` buscaba `/i18n/` en rutas de archivo; en Windows las rutas usan `\\`, así que la prueba de «la interfaz no usa la API de Figma» falló en la computadora de Nehemias (1 de 325) y no en el CI de GitHub, que corre en Linux. Se arregló normalizando las rutas y se agregó Windows al CI. *Lección:* probar en el sistema donde de verdad se trabaja; los fallos de separadores de ruta solo se ven ahí.
- **Eliminar el código de IA de la versión sin IA tomó cuatro intentos.** Una constante compartida, luego `sideEffects`, luego una función extraída: esbuild solo pliega banderas escritas en el mismo archivo. *Lección:* medir lo que se promete (hay una prueba que busca `api.anthropic.com` en el paquete sin IA).
- **Descubrí tarde una regla de publicación.** Figma «generalmente no aprueba» plugins con clave de API de otro proveedor de IA. Lo encontré al preparar la ficha, no al diseñar. *Lección:* leer las guías de revisión antes de construir.
- **Un chequeo mío se colgó.** Intenté extraer fotogramas del video con un navegador desde `about:blank`, que no puede abrir archivos locales. Lo detuve y confié en el guion de la grabación, que sí verificó cada paso. *Lección:* decir qué no pude comprobar.

## Cómo se agrega uno
Cuando aparezca un error visible, **se captura en ese momento, antes de arreglarlo**:
```bash
# 1. Captura del «antes» (id de la galería, tema y tamaño opcionales)
node scripts/screenshots.mjs --scale 2 --size 320x440 --theme dark --out docs/assets/errores/E007-nombre/antes <id-de-pantalla>
# 2. Arréglelo.
# 3. Captura del «después» con el mismo comando, cambiando la carpeta a …/despues
```
- Si el error ocurre en Figma (no en la galería), capture la ventana con la herramienta del sistema y guárdela en la misma carpeta, con el mismo esquema.
- Si el error está en un estado que la galería no tiene, **primero agregue ese estado a `preview/entries.tsx`**: así queda reproducible.
- Agregue su entrada aquí: *qué se veía · capturas · causa · arreglo · lección*, y una fila en el resumen.
