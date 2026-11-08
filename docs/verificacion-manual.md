# Verificación manual en Figma

> Para probar paso a paso, con lo que debería pasar en cada paso y una plantilla de informe, use **[`guia-de-prueba.md`](guia-de-prueba.md)**. Esta es la lista corta de casillas.

Las pruebas automáticas usan una API de Figma **simulada** (`tests/plugin.test.ts`, `src/read/read.test.ts`, `src/fixes/fixes.test.ts`). Lo que sigue solo se puede comprobar en la app de escritorio, con el archivo de `fixtures/archivo-prueba.md`. Marque cada punto.

## Preparación
- [ ] `npm install && npm run build`
- [ ] Figma escritorio → Plugins → Development → Import plugin from manifest… → `manifest.json`
- [ ] Armar el archivo de prueba (`fixtures/archivo-prueba.md`)

## Lectura y reglas
- [ ] Abre en 360 × 560, con el tema claro y con el oscuro (Preferencias → Tema).
- [ ] «Revisar» con el frame del archivo de prueba seleccionado: **11 hallazgos**, E01b como «No verificado».
- [ ] «Página actual» funciona y no congela Figma en una página grande (mueva el lienzo mientras revisa).
- [ ] «Cancelar» durante una revisión grande vuelve a Inicio.
- [ ] Capas ocultas se omiten; con «Revisar capas ocultas» se incluyen.
- [ ] Instancias de bibliotecas: sus capas internas no generan avisos de estilo ni nombres.
- [ ] Texto con varios estilos (mezclado) no rompe la revisión.
- [ ] Un archivo sin estilos locales: los colores se marcan «sin estilo» y sin corrección sugerida.
- [ ] Un archivo con variables de color: «casi igual» y «aplicar» proponen la variable.

## Interacciones
- [ ] Clic en un hallazgo: selecciona la capa y hace zoom.
- [ ] Clic en un hallazgo de otra página (cambie de página tras revisar): salta a esa página.
- [ ] «Ignorar» se recuerda: cierre y vuelva a abrir el plugin, y el hallazgo sigue ignorado. «Deshacer» del aviso lo restaura.
- [ ] Redimensionar con el asa de la esquina; al reabrir, recuerda el tamaño.
- [ ] Teclado: Tab llega a todo, foco visible, Esc cierra la hoja de lote.

## Correcciones (cada una con Ctrl+Z)
Para cada tipo: abrir la vista previa, quitar una casilla, aplicar, comprobar el resultado y pulsar **Ctrl+Z una sola vez**: debe deshacer **todo el lote**.
- [ ] Renombrar capas (nombres por tipo: «Fila», «Botón / Relleno»…).
- [ ] Aplicar estilo de color más cercano (estilo).
- [ ] Aplicar variable de color más cercana.
- [ ] Aplicar estilo de texto (con fuentes distintas a Inter; debe cargar la fuente sin error).
- [ ] Ajustar espaciado a la rejilla de 4 y de 8 px.
- [ ] Si cambia un valor a mano entre la revisión y «Aplicar», esa capa se omite y se avisa.
- [ ] Si borra una capa entre la revisión y «Aplicar», se omite sin error.

> Punto crítico: confirme que `figma.commitUndo()` deja **un** paso de deshacer por lote. Si Figma lo agrupara distinto, ajuste `src/fixes/apply.ts` (la llamada está al final de `applyFixes`).

## IA (necesita su clave de Anthropic)
- [ ] Ajustes → pegar clave → «Probar clave»: «La clave funciona».
- [ ] Clave inválida → mensaje claro; sin conexión → mensaje claro y «Revisar sin IA».
- [ ] La clave **no** aparece en el archivo: Plugins → Development → Open console → `figma.root.getPluginDataKeys()` solo lista `ignored`, `last` y `aiCache`.

## Red
- [ ] Consola → Network: con la IA apagada no hay ninguna petición. Con la IA encendida, solo a `api.anthropic.com`.
