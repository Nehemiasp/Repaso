# Guía para probar Repaso en Figma

Repaso se probó con una API de Figma **simulada**; nunca corrió dentro de Figma. Esta guía es para cerrar esa brecha. Siga el orden: cada parte dice **qué hacer** y **qué debería pasar**. Si algo no coincide, anótelo en el informe del final (hay plantilla) y siga: no hace falta arreglarlo en el momento.

Tiempo estimado: 20 min la prueba rápida (partes 1 a 3), 1 h el recorrido completo (partes 4 a 8) y 10 min la IA (parte 9, opcional).

## 0 · Qué necesita
- La **app de escritorio de Figma** (macOS o Windows). Los plugins en desarrollo **no se cargan desde el navegador**.
- **Node 22** y npm, y este repositorio clonado.
- Un archivo de Figma donde se pueda ensuciar. **No use archivos de clientes ni de NIU.**
- Para la parte 9 (opcional): una clave de Anthropic con algo de saldo. La prueba cuesta centavos.

## 1 · Instalar y compilar
```bash
git clone https://github.com/Nehemiasp/Repaso.git
cd Repaso
npm install
npm run build
```
Debe terminar sin errores y crear `dist/code.js` y `dist/ui.html`. Si quiere confirmar antes de abrir Figma que todo está sano: `npm test` (325 pruebas en verde).

Hay **dos versiones** del plugin:

| | Compilar | Manifiesto que se importa | Para qué |
|---|---|---|---|
| Completa (con IA) | `npm run build` | `manifest.json` | probar todo, incluida la IA |
| Comunidad (sin IA ni red) | `npm run build:community` | `dist-community/manifest.json` | probar lo que se publicaría |

Pruebe primero la **completa** (partes 2 a 9). Al final, repita la parte 2 y la 3 con la de comunidad (parte 10).

## 2 · Cargarlo en Figma
1. Abra Figma y cualquier archivo de diseño (uno nuevo sirve).
2. Menú principal (☰ arriba a la izquierda) → **Plugins → Development → Import plugin from manifest…**
3. Elija el `manifest.json` de la carpeta del repositorio.
4. Ejecútelo: **Plugins → Development → Repaso**.
5. Abra la consola de Figma, que es donde se verán los errores técnicos: **Plugins → Development → Open console**. Déjela abierta durante toda la prueba.

**Debería pasar:** se abre una ventana de unos 360 × 560 px con la pantalla de **Bienvenida** (motivo de cuadros, tres líneas, «Revisar selección»).

Si Figma se queja del `id` del manifiesto (vale `0000000000000000000`): para desarrollo debería aceptarlo. Si no, cree un plugin vacío con **Plugins → Development → New plugin…**, copie el `id` que le asigna y péguelo en `manifest.json`.

**Para ir recargando mientras prueba:** deje `npm run watch` corriendo en una terminal. Tras cada cambio, vuelva a ejecutar el plugin (Figma recuerda el último con *Plugins → Run last plugin*, atajo `⌥⌘P` en macOS o `Ctrl+Alt+P` en Windows).

## 3 · Prueba de humo (5 min, sin armar nada)
| # | Haga | Debería pasar |
|---|---|---|
| 3.1 | Cambie el tema de Figma entre claro y oscuro (Preferencias → Theme) y reabra el plugin | La interfaz sigue el tema. El azul de marca es `#043565` en claro y `#8DB6E8` en oscuro |
| 3.2 | En Bienvenida, pulse **Ajustes** y vuelva con la flecha | Abre y vuelve sin errores. Pulse «Acerca de»: dice versión 0.1.0 y enlaza a nehemiasperez.com |
| 3.3 | Con **nada seleccionado**, elija «Selección» y pulse **Revisar** | Pantalla de error **«No hay nada seleccionado»** con «Revisar la página actual» |
| 3.4 | En un archivo vacío, pulse «Página actual» → Revisar | Error **«La selección está vacía»** |
| 3.5 | Dibuje un rectángulo con **R**, selecciónelo y pulse Revisar | Resultados con pocos hallazgos: «Color sin estilo» (el gris por defecto) y «Capa sin nombre» («Rectangle 1»), sin errores en la consola |
| 3.6 | Redimensione la ventana con el asa de la esquina inferior derecha; cierre y reabra el plugin | Cambia de tamaño y **recuerda el tamaño** |

## 4 · Armar el archivo de prueba
Siga **[`fixtures/archivo-prueba.md`](../fixtures/archivo-prueba.md)**: crea 4 estilos de color, 3 estilos de texto y 11 tarjetas, cada una con **un error a propósito**. Son unos 30 minutos.

Atajos:
- Haga la **primera tarjeta bien** (auto layout vertical, gap 8, padding 16, relleno `Fondo/Blanco`, texto con estilo `Cuerpo`), duplíquela con `Ctrl/Cmd+D` y a cada copia cámbiele solo lo que dice la tabla.
- El **set de componentes «Botón»** con la propiedad `Estado`: cree el componente, **Add variant** dos veces y renombre las propiedades a `Estado=Normal` y `Estado=Hover`.

**Alternativa sin esfuerzo:** pídame que lo arme yo. Puedo crearlo en un archivo nuevo de su cuenta de Figma con las herramientas conectadas. No lo hice porque crea un archivo en su cuenta, y prefiero que usted lo decida.

## 5 · Lectura y reglas (la prueba más importante)
Seleccione el frame **«Archivo de prueba»** y pulse **Revisar**.

**Debería pasar:**
- Una pantalla «Revisando…» que sube de 0 a 100 %, y luego **Resultados**.
- **11 hallazgos**, con este reparto aproximado: 1 crítica, 2 altas, 4 medias, 4 bajas, 1 «No verificado».
- Los hallazgos son los de la tabla de `fixtures/archivo-prueba.md`: contraste (2), texto pequeño, área táctil, capas sin nombre (2), color sin estilo, color casi igual, texto sin estilo, espaciado, componente sin estados.
- El del texto sobre la **foto** dice **«No verificado»** (nunca «aprobado»).
- Puntaje cercano a **68/100**, y «¿Por qué este puntaje?» muestra el desglose por regla.

**Si salen más o menos hallazgos:** casi siempre es que algo del archivo no quedó como dice el documento (un relleno sin estilo, un nombre por defecto). Antes de culpar al plugin, mire cuáles son los hallazgos de más. Si el plugin se equivocó de verdad, **es justo lo que esta prueba busca**: anótelo con el nombre de la capa.

Otras comprobaciones de lectura:
| # | Haga | Debería pasar |
|---|---|---|
| 5.1 | Pruebe con «Página actual» | Revisa toda la página; la cuenta de capas es mayor |
| 5.2 | Cree un **archivo limpio**: un frame con todo en estilos y espaciados múltiplos de 4 | **0 hallazgos**, 100/100, pantalla «Todo en orden» |
| 5.3 | Oculte una capa con hallazgos (ojo en el panel de capas) y revise | Ya no aparece. Con Ajustes → «Revisar capas ocultas», vuelve a aparecer |
| 5.4 | Seleccione una **instancia** de una biblioteca o de un componente suyo | Sus capas internas **no** generan «sin nombre» ni «sin estilo» |
| 5.5 | Cree un texto con **dos colores o dos tamaños** (selección parcial) y revise | No se rompe; el texto se lee con el primer tramo |
| 5.6 | Pruebe un archivo **sin estilos locales** | Los colores salen «sin estilo» y **sin** botón Corregir |

## 6 · Interacciones
| # | Haga | Debería pasar |
|---|---|---|
| 6.1 | Pulse un hallazgo | Figma **selecciona la capa y hace zoom** a ella |
| 6.2 | Cambie a otra página de Figma y pulse un hallazgo de la revisión anterior | Salta a la página de esa capa |
| 6.3 | Borre una capa con hallazgo y pulse ese hallazgo | Aviso de Figma: «Esa capa ya no existe. Vuelva a revisar.» |
| 6.4 | Pulse **Ignorar** en un hallazgo; luego «Deshacer» del aviso inferior | Desaparece; con «Deshacer» vuelve |
| 6.5 | Ignore uno, **cierre el plugin y ábralo de nuevo**, revise otra vez | Sigue ignorado (se recuerda **por archivo**). «Restaurar» lo devuelve |
| 6.6 | Pestañas por categoría con flechas ← → | Filtra y los contadores coinciden con la lista |
| 6.7 | Teclado: `Tab` por toda la pantalla | Llega a todo, con anillo de foco visible; `Esc` cierra la hoja de lote |
| 6.8 | Pulse el ícono de copiar → **Copiar Markdown**; pegue en Notion o en un editor | Reporte con título, puntaje, tabla del puntaje y hallazgos por categoría; cada severidad con **texto** («Alta»), no solo ícono |

## 7 · Correcciones y Ctrl+Z (lo que más se desconoce)
Para **cada** tipo de corrección: pulse el botón de lote, **quite una casilla**, aplique, compruebe el resultado y pulse **`Ctrl/Cmd+Z` una sola vez**.

| # | Corrección | Debería pasar al aplicar | Y con un solo Ctrl+Z |
|---|---|---|---|
| 7.1 | **Renombrar capas** | «Frame 482» pasa a «Fila»; «Rectangle 12» a «Rectángulo» | Vuelven **los dos** nombres |
| 7.2 | **Estilo de color** (casi igual → estilo) | El relleno pasa a usar `Marca/Azul` | Vuelve al color anterior |
| 7.3 | **Estilo de texto** | El texto toma el estilo `Cuerpo` sin error de fuente | Vuelve sin estilo |
| 7.4 | **Espaciado** | gap 13 → 12 y relleno 10 → 12 | Vuelve gap 13 y relleno 10 |
| 7.5 | **Variable de color** (si el archivo tiene variables de color) | Se vincula la variable | Vuelve |

**El punto crítico:** `Ctrl+Z` debe deshacer **todo el lote de una vez**, no capa por capa. Si hace falta pulsarlo varias veces, anótelo: se arregla en `src/fixes/apply.ts` (la llamada a `commitUndo()` está al final de `applyFixes`).

Más casos:
- 7.6 Con la vista previa abierta, **cambie a mano** un valor (por ejemplo el gap) y aplique: esa capa se **omite** y se avisa («ya no existe o cambió»).
- 7.7 Con la vista previa abierta, **borre una capa** y aplique: se omite sin error.
- 7.8 Tras aplicar, los hallazgos corregidos **desaparecen** de la lista y aparece el aviso «Ctrl+Z los deshace».
- 7.9 Un **texto con fuente que no tiene instalada** o con varias fuentes: debe avisar o saltarlo, no romperse.

## 8 · Ajustes, rendimiento y errores
**Ajustes**
| # | Haga | Debería pasar |
|---|---|---|
| 8.1 | Apague la regla «Texto pequeño» y revise | Ya no hay hallazgos de esa regla |
| 8.2 | Suba «Tamaño mínimo de texto» a 16 | Aparecen más textos pequeños |
| 8.3 | Cambie la rejilla a 8 px | El espaciado de 12 pasa a ser un hallazgo |
| 8.4 | Contraste **AAA** | Más hallazgos de contraste |
| 8.5 | «Restaurar valores» | Todo vuelve a lo predeterminado |

**Rendimiento (2 000 capas)**
1. Seleccione las 11 tarjetas, duplíquelas con `Ctrl/Cmd+D` y **siga pulsando `Ctrl/Cmd+D`** (Figma repite el desplazamiento) hasta tener varios cientos de capas. La cuenta de capas la muestra Repaso al terminar («N capas revisadas»).
2. Revise «Página actual» con un cronómetro.
3. **Mientras revisa, mueva y haga zoom en el lienzo.** Debe seguir **fluido**; ese es el objetivo («no congelar Figma»).
4. Pulse **Cancelar** a mitad: vuelve a Inicio.
5. Anote la cuenta de capas y los segundos. Es el número que falta en `evals/reporte.md` (hoy hay uno medido con nodos simulados; en Figma será mayor).
6. Con más de **20 000 capas** debe salir el error **«El archivo es demasiado grande»** con la sugerencia de revisar por partes.

## 9 · IA (opcional, gasta unos centavos)
**Ajustes → Inteligencia artificial.**
| # | Haga | Debería pasar |
|---|---|---|
| 9.1 | Pegue una clave **falsa** (`sk-ant-` seguido de letras al azar) → **Probar clave** | Mensaje claro: «Anthropic rechazó la clave» |
| 9.2 | Pegue su clave real → **Probar clave** | «La clave funciona». Aparece «Clave guardada en este equipo (••••1234)» |
| 9.3 | Active **Usar IA** y revise el archivo de prueba | Las capas «Frame 482» y «Rectangle 12» traen una **nota de IA** con un nombre sugerido; el set sin estados trae cómo deberían verse los que faltan; hay un **resumen** arriba |
| 9.4 | Pulse Corregir → Renombrar | La vista previa muestra los nombres de la IA con la etiqueta «IA» |
| 9.5 | Revise **otra vez** el mismo archivo | Es más rápido y gasta casi nada: lo que no cambió sale de la **caché** |
| 9.6 | Con textos con errores (ver `fixtures/textos-con-errores.json`: «Contraseña inválda», «Ingresa tu nombre», «CANCELAR» junto a «Guardar») | Hallazgos de **ortografía**, **trato** y **mayúsculas** apuntando a cada capa |
| 9.7 | Un archivo grande (los cientos de capas de la parte 8) | Antes de gastar sale **«Antes de usar la IA»** con el costo estimado y los botones «Continuar con IA» / «Solo reglas» |
| 9.8 | En Ajustes, baje el **tope por revisión** a 0,05 USD y revise un archivo grande | La IA revisa una parte y avisa que se alcanzó el tope |
| 9.9 | Apague el wifi y revise con IA | Error **«No hay conexión con la IA»** con «Revisar sin IA» |
| 9.10 | Confirme la **privacidad**: en la consola de Figma, pestaña **Network** (si su versión la trae), durante una revisión **sin IA** | **Ninguna** petición de red. Con IA, solo a `api.anthropic.com` |
| 9.11 | Confirme que la clave no viaja en el archivo: en la consola, `figma.root.getPluginDataKeys()` | Solo `ignored`, `last` y `aiCache`; ninguna con la clave |

Si una petición a la IA falla por **CORS** (la consola muestra «blocked by CORS policy» o «Failed to fetch» aun con wifi), anótelo con el texto exacto: el plugin manda el encabezado `anthropic-dangerous-direct-browser-access`, pero es lo que más puede variar según cómo Figma ejecute `fetch`. Si su organización de Anthropic tiene retención de datos cero, la API rechaza las llamadas desde navegador a propósito: Repaso lo explica en el detalle técnico del error.

## 10 · La versión de comunidad
```bash
npm run build:community
```
Importe `dist-community/manifest.json` (como en la parte 2) y repita las partes 3, 5, 6 y 7.

**Debería pasar:** funciona igual, **sin** sección de IA, trato ni clave en Ajustes; sin chip de IA en Inicio; la bienvenida dice «Todo ocurre en su equipo». En la consola → Network: **cero** peticiones **siempre**. Figma debería mostrar para esta versión «No network access».

## 11 · Si algo falla
1. **Mire la consola** (Plugins → Development → Open console) y copie el error completo.
2. **Capture la pantalla antes de arreglar nada.** Guárdela en `docs/assets/errores/E007-nombre-corto/antes.png` (sigue la numeración de la [bitácora de errores](bitacora-de-errores.md)): son material para el caso de estudio.
3. Anótelo en el informe de abajo: qué hizo, qué esperaba, qué pasó.
4. Pásemelo (el informe con las capturas) y lo arreglo con una prueba que lo cubra.

Puntos donde ya sospecho que podría haber diferencias, por si le sirve de pista:
- `commitUndo`: que un lote sea **un** paso de deshacer (parte 7).
- Textos con **estilos mezclados** y capas dentro de **instancias** (5.4 y 5.5).
- Aplicar un estilo de texto cuando la **fuente** del texto o del estilo no está cargada (7.3 y 7.9).
- `fetch` desde el hilo principal de Figma y **CORS** (parte 9).
- El tiempo real de lectura en archivos grandes (parte 8).
- Que **Inter** no esté disponible dentro del iframe y se vea la fuente del sistema (es esperable; ver `RETOQUES.md`).

## Informe de prueba (cópielo y complételo)
Fecha: ____ · Versión de Figma: ____ · Sistema: ____ · Versión del plugin: 0.1.0 · Compilación: ☐ completa ☐ comunidad

| # | Resultado | Notas (qué pasó, nombre de la capa, error de la consola) |
|---|---|---|
| 2 · Carga e importación | ☐ ok ☐ falla | |
| 3 · Prueba de humo | ☐ ok ☐ falla | |
| 5 · Lectura y reglas (11 hallazgos) | ☐ ok ☐ falla | Hallazgos: ___ de 11 |
| 5.2 · Archivo limpio = 0 hallazgos | ☐ ok ☐ falla | |
| 6 · Interacciones | ☐ ok ☐ falla | |
| 7.1 · Renombrar + un Ctrl+Z | ☐ ok ☐ falla | |
| 7.2 · Estilo de color + un Ctrl+Z | ☐ ok ☐ falla | |
| 7.3 · Estilo de texto + un Ctrl+Z | ☐ ok ☐ falla | |
| 7.4 · Espaciado + un Ctrl+Z | ☐ ok ☐ falla | |
| 8 · Ajustes | ☐ ok ☐ falla | |
| 8 · Rendimiento | ☐ ok ☐ falla | Capas: ___ · Segundos: ___ · ¿Fluido?: ___ |
| 9 · IA | ☐ ok ☐ falla ☐ no probada | |
| 10 · Versión comunidad | ☐ ok ☐ falla ☐ no probada | |

**Lo que más me molestó al usarlo (como diseñador):** ____

Cuando esté listo, la lista corta para el día de publicar sigue en [`verificacion-manual.md`](verificacion-manual.md).
