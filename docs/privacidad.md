# Política de privacidad · Repaso

*Última actualización: 8 de noviembre de 2026. Autor: Nehemias Pérez · nehemiasperez.com*

Repaso es un plugin de Figma que revisa diseños. Esta política dice, en corto, qué hace con sus datos.

## Lo esencial
- **No tengo servidor, base de datos ni cuentas.** No recibo ni guardo nada de lo que usted revisa.
- **Sin IA, nada sale de su equipo.** Las 9 reglas se ejecutan dentro de Figma y funcionan sin internet.
- **Con IA (solo la versión completa), usted decide.** La IA está apagada por defecto. Si la activa, Repaso habla directamente con la API de Anthropic usando **su propia clave**. Yo no veo esa comunicación.

## Qué se envía a la IA (solo si usted la activa)
Solo lo necesario para cada tarea:
- **Nombres de capas**, su tipo, tamaño, tipo de auto layout, posición relativa dentro de su contenedor y los textos de sus hijos (para proponer nombres).
- **Textos visibles** de la selección o la página (para revisar ortografía, mayúsculas en botones y trato «tú»/«usted»).
- **Resúmenes de variantes de un componente** (colores de relleno y texto, trazo, radio, opacidad) para describir estados faltantes.
- **Cifras de la revisión** (puntaje, conteos) para redactar el resumen.

**Nunca** se envían imágenes, vistas previas, comentarios, el archivo completo ni datos de otras personas. Antes de revisar un archivo grande, Repaso le muestra un estimado de costo y puede detenerlo.

El destino es **api.anthropic.com**, y es el único dominio que el plugin tiene permitido. Lo que Anthropic haga con esos datos se rige por sus propios términos y política: https://www.anthropic.com/legal/privacy

## Dónde se guarda lo que Repaso recuerda
| Qué | Dónde | Quién puede verlo |
|---|---|---|
| Su clave de Anthropic | `figma.clientStorage`, en su equipo | solo usted; nunca va al archivo ni a ningún servidor mío |
| Ajustes (reglas, umbrales, tamaño de ventana) | `figma.clientStorage`, en su equipo | solo usted |
| Hallazgos ignorados y última revisión | datos del plugin dentro del propio archivo de Figma | quien tenga acceso al archivo |
| Caché de la IA (nombres y textos ya revisados) | datos del plugin dentro del propio archivo | quien tenga acceso al archivo |

Puede borrar la clave desde Ajustes → «Borrar clave», y los ignorados con «Borrar ignorados de este archivo».

## Qué no hago
- No uso analítica, rastreadores, cookies ni publicidad.
- No vendo ni comparto datos: no los tengo.
- No modifico su archivo sin que usted pulse «Aplicar» tras ver la vista previa. Cada lote se deshace con Ctrl+Z.

## Cambios y contacto
Si esta política cambia, actualizaré la fecha de arriba y las notas de versión del plugin. Preguntas: *(su correo de contacto)*.

---

# Privacy policy · Repaso (English summary)

*Last updated: 8 November 2026. Author: Nehemias Pérez · nehemiasperez.com*

- **No server, no database, no accounts.** I never receive or store anything you review.
- **Without AI, nothing leaves your machine.** All 9 rules run inside Figma and work offline.
- **With AI (full build only) you decide.** AI is off by default. If you turn it on, Repaso talks directly to Anthropic's API with **your own key**. I can't see that traffic.
- **What is sent to AI:** layer names, types, sizes, layout, relative position and child text (naming); visible text (spelling, button capitalization, tú/usted); colour and shape summaries of component variants (missing states); review counts (summary). **Never** images, previews, comments or the whole file. The only allowed domain is `api.anthropic.com`; Anthropic's own policy governs what happens there: https://www.anthropic.com/legal/privacy
- **Where things are stored:** your API key and settings in `figma.clientStorage` on your machine (never in the file, never on any server of mine); ignored findings, last-review summary and the AI cache as plugin data inside your Figma file.
- **What I don't do:** no analytics, trackers, cookies or ads; I don't sell or share data (I don't have any); I never change your file until you press "Apply" after previewing, and each batch undoes with one Ctrl+Z.
- Contact: *(your contact email)*.
