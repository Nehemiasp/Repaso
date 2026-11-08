# Repaso — Plugin de Figma que audita y ordena diseños

Proyecto personal de Nehemias Pérez (Diseñador UI/UX) para su sección «Laboratorio» en nehemiasperez.com. Marca personal, no Lumacode. Interfaz en español, trato de «usted». «Repaso» es nombre de trabajo (verificar en figma.com/community antes de publicar; reserva: «Cuadre»).

## Cómo funciona un plugin de Figma (30 segundos)
- **Hilo principal** (`src/plugin/`, salida `dist/code.js`): corre en un sandbox, tiene la API `figma.*` (leer/modificar nodos) pero **no tiene DOM**. Con `documentAccess: "dynamic-page"` solo se usan APIs asíncronas (`getNodeByIdAsync`, `page.loadAsync`…).
- **Interfaz** (`src/ui/`, salida `dist/ui.html`): un `<iframe>` normal con DOM, pero **sin acceso a `figma.*`**. Origen `null`.
- **Mensajes**: UI → principal con `parent.postMessage({ pluginMessage }, '*')`, recibido en `figma.ui.onmessage`. Principal → UI con `figma.ui.postMessage(x)`, recibido en `window.onmessage` (`event.data.pluginMessage`). Los tipos de mensaje viven en `src/shared/messages.ts`.
- **Almacenamiento**: `figma.clientStorage` (equipo del usuario: ajustes y clave de IA) y `setPluginData` en el archivo (ignorados y caché de IA, viajan con el archivo).

## Arquitectura en tres capas (+ IA y UI)
1. `src/read/` — Lectura: nodos de Figma → datos simples serializables (`src/shared/types.ts`). Única capa que toca la API para leer.
2. `src/engine/` — Motor de reglas: **funciones puras**, sin `figma`. Cobertura 100 % exigida (`npm run coverage`).
3. `src/fixes/` — Correcciones: aplican cambios en Figma; un lote = un paso de Ctrl+Z.
- `src/ai/` — Cliente de Anthropic y validación. Tampoco importa `figma`. Nunca inventa hallazgos de reglas.
- `src/ui/` — Preact. Todo estilo sale de `src/ui/styles/tokens.css`; nada de estilos sueltos en la lógica.
- `src/plugin/` — Orquesta: recibe mensajes, lee, corre el motor, responde.

## Comandos
- `npm run build` → `dist/code.js` + `dist/ui.html`. `npm run watch` reconstruye al guardar.
- `npm test` · `npm run coverage` · `npm run typecheck`
- `npm run preview` → galería de estados en el navegador (http://localhost:5173), sin abrir Figma.

## Cargar el plugin en Figma (modo desarrollo)
1. App de escritorio de Figma (macOS o Windows). Abra cualquier archivo de diseño.
2. `npm install && npm run build`.
3. Menú → Plugins → Development → **Import plugin from manifest…** → elija `manifest.json` de esta carpeta.
4. Ejecute Plugins → Development → Repaso. Con `npm run watch`, vuelva a ejecutarlo tras cada cambio. Consola: Plugins → Development → Open console.

## Reglas de trabajo
- TypeScript estricto. No `any` salvo en el borde con la API de Figma, comentado.
- Antes de usar una API de Figma, revisar developers.figma.com.
- `manifest.json`: `networkAccess.allowedDomains` solo `https://api.anthropic.com`.
- La clave de Anthropic nunca va en el código ni pasa por un servidor propio. Se guarda en `figma.clientStorage`.
- Privacidad: las revisiones sin IA funcionan sin internet. A la IA solo: nombres de capas, textos y estructura.
- Nada de archivos de clientes ni de NIU en pruebas, fixtures, capturas o caso de estudio.
- Hook: al editar `src/**`, `scripts/hook-tests.mjs` corre Vitest relacionado (`.claude/settings.json`).
- Al agregar una decisión técnica, añádala abajo en una línea.

## Decisiones
- **esbuild** para construir: sin Vite, menos dependencias y builds en milisegundos; la UI se incrusta en un solo HTML.
- **Preact** para la UI: ~4 KB con API de React; más cómodo que JS puro para ~9 pantallas con estados.
- **Vitest** con umbral 100 % en `src/engine/**` para forzar que el motor siga siendo puro y probado.
- **Lista plana de nodos con índice por id** como formato del motor: fácil de serializar, de fabricar en pruebas y de recorrer por trozos.
- **Lectura y reglas por trozos con presupuesto de ~8 ms** y `await` entre trozos para no congelar Figma en archivos grandes; cancelable.
- **Contraste WCAG 2.x** calculado contra el fondo sólido real al subir por los padres; imagen/degradado detrás ⇒ «no se pudo verificar», nunca aprobado.
- **ΔE2000** para «color casi igual a un estilo»: es perceptual y evita falsos positivos que da RGB.
- **Puntaje = 100 − Σ(peso por severidad)** con tope por regla (para que 500 capas sin nombre no hundan todo) y desglose visible.
- **Un lote de correcciones = un solo `commitUndo`** para que Ctrl+Z lo deshaga entero.
- **Ignorados y caché de IA en `setPluginData` del archivo**; ajustes y clave en `clientStorage` (quedan en el equipo, no en el archivo).
- **Claude por `fetch` desde el hilo principal** con `tool_use` + `input_schema` para JSON estructurado, validado a mano (sin Zod por tamaño), un reintento y descarte silencioso.
- **Modelo económico por defecto (`claude-haiku-5-5`)**, lotes de ~40 capas, caché por hash y tope de costo por revisión.
- **Tokens CSS únicos** (`tokens.css`) sobre las variables `--figma-color-*` con `themeColors: true`, para que siga el tema claro/oscuro de Figma.
- **`fetch` directo a `/v1/messages` en vez del SDK de Anthropic**: corre en el hilo principal de Figma (JS restringido, no verificable desde aquí), el manifiesto solo permite un dominio y es una sola llamada; así el bundle sigue chico. Envía `anthropic-dangerous-direct-browser-access: true` por CORS.
- **Salida estructurada con `output_config.format` (JSON Schema)** en vez de `tool_choice` forzado: los modelos del menú rechazan el forzado; el esquema no admite `maxLength`, así que el largo se valida en `src/ai/validate.ts`.
- **Sin `temperature` ni `thinking`, con `effort: "low"`**: los modelos 5.x rechazan muestreo; el razonamiento adaptativo a esfuerzo bajo basta para nombrar y corregir textos y cuesta poco.
- **«Probar clave» usa `GET /v1/models`**: valida la clave y CORS sin gastar un solo token.
- **Una respuesta inválida se reintenta una vez y luego se descarta ese lote**; clave, saldo, límite y conexión sí se muestran como error con salida («Revisar sin IA», solo esa vez).
- **La IA nunca toca las reglas**: solo agrega nombres, notas de estados, hallazgos de texto (`ai-*`) y el resumen. Un test comprueba que la lista de reglas queda intacta.
- **Control de costo**: lotes (40 nombres / 8 sets / 60 textos), textos repetidos se envían una vez, caché por archivo en `setPluginData('aiCache')` (clave = hash de la estructura; la de botones incluye todas las etiquetas porque las mayúsculas dependen del conjunto), estimado y confirmación en archivos grandes (>120 elementos o >0,02 USD) y tope por revisión que corta y avisa.
- **Lo que se envía**: nombre, tipo, tamaño, layout, posición relativa y textos de hijos; colores solo de variantes de componente. Un test verifica que no salgan colores ni imágenes en nombres y textos.
