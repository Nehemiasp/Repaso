# Ficha de la comunidad · Español

**Nombre:** Repaso

**Eslogan:** Audita y ordena sus diseños antes de entregarlos.

**Categoría:** Design tools

**Descripción**

Repaso revisa su selección o su página y le señala lo que un buen diseño no debería tener. Donde se puede, lo corrige con un clic, y todo se deshace con Ctrl+Z.

**Qué revisa**
- Contraste de texto (AA o AAA). Si hay una imagen o un degradado detrás, dice «no se pudo verificar»: nunca lo da por bueno.
- Textos demasiado pequeños.
- Elementos interactivos con área táctil menor a la recomendada.
- Capas sin nombre («Frame 482», «Rectangle 12»).
- Colores y textos sin estilo o variable, y colores casi iguales a un estilo que ya existe.
- Espaciados de auto layout fuera de su rejilla (4 u 8 px).
- Componentes sin estados: hover, foco, deshabilitado y, en campos, error.

**Cómo funciona**
1. Seleccione capas, o elija «Página actual», y pulse Revisar.
2. Verá un puntaje de 0 a 100 que se explica solo: qué regla resta cuánto.
3. Pulse un hallazgo para ir a la capa. «Ignorar» lo recuerda en ese archivo.
4. Las correcciones en lote muestran antes y después, con casillas para quitar lo que no quiera. Un lote = un Ctrl+Z.
5. Copie el reporte en Markdown para pegarlo en una tarea o en Notion.

**Hecho para no molestar**
- Active solo las reglas que le sirvan y ajuste los umbrales: tamaño de texto, área táctil, rejilla de espaciado y nivel de contraste.
- No congela Figma en archivos grandes: procesa por partes y se puede cancelar.
- Funciona con teclado y sigue el tema claro u oscuro de Figma. Interfaz en español.

**Privacidad**
Las revisiones funcionan sin internet. Repaso no tiene servidor ni cuentas, no guarda sus datos y no envía nada fuera de Figma.

**(solo versión con IA)** La IA es opcional y usa **su propia clave de Anthropic** (se necesita una cuenta de Anthropic con saldo; el uso típico cuesta centavos). Propone nombres de capa, describe los estados que faltan, revisa ortografía, mayúsculas en botones y el trato «tú»/«usted», y resume la revisión. Envía únicamente nombres de capas, textos y estructura a api.anthropic.com, nunca imágenes. La clave queda en su equipo y no pasa por ningún servidor de Repaso. Antes de revisar un archivo grande se muestra un estimado de costo y se puede poner un tope.

**Acceso a red:** versión sin IA, ninguno. Versión con IA, solo api.anthropic.com y solo si usted activa la IA.

**Política de privacidad:** https://nehemiasperez.com/laboratorio/repaso/privacidad *(publíquela ahí o cambie la URL)*

**Soporte:** *(su correo o página de contacto)*

**Autor:** Nehemias Pérez · https://nehemiasperez.com

**Notas de la versión 0.1.0**
Primera versión: 9 reglas, puntaje explicable, correcciones en lote con vista previa y exportación a Markdown.
