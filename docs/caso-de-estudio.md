# Caso de estudio · Repaso

> Borrador para «Laboratorio» en nehemiasperez.com. Escrito en primera persona para que lo reescriba con su voz. Lo que está entre **[corchetes]** lo debe completar usted: son cosas que solo usted puede decir o medir. Nada de aquí menciona clientes ni NIU.

## En una frase
Un plugin de Figma que revisa un diseño antes de entregarlo a desarrollo y señala lo que no debería llegar: contraste, textos chicos, áreas táctiles, capas sin nombre, estilos, espaciado, estados faltantes y textos. Donde se puede, corrige con un clic y se deshace con Ctrl+Z.

## 1 · El problema
Los archivos de diseño llegan a desarrollo desordenados, y los errores de accesibilidad llegan con ellos:
- Capas llamadas «Frame 482» que obligan a adivinar qué es cada cosa.
- Textos gris claro sobre blanco que nadie midió.
- Botones de 32 × 24 px que en un teléfono no se pueden tocar bien.
- Colores casi iguales a los del sistema de diseño, pero no los mismos; espaciados de 13 px en una rejilla de 4.
- Componentes que existen en «Normal» y nunca se diseñaron en foco o deshabilitado.

Se arreglan en minutos si alguien los ve a tiempo. Repaso es esa segunda mirada, hecha por una máquina que no se cansa.

**[Una anécdota real, sin cliente: la vez que un error así costó una vuelta de revisión.]**

## 2 · Decisiones
### Qué reglas incluí (9) y por qué
| Regla | Por qué vale la pena |
|---|---|
| Contraste | Es lo que más daño hace y se puede medir. Calcula el fondo real subiendo por los padres; si hay imagen o degradado detrás dice **«no se pudo verificar»**, nunca «aprobado». |
| Texto pequeño | Barata, sin falsos positivos, umbral editable. |
| Área táctil | Solo en componentes o instancias cuyo nombre o propiedades indican que son interactivos: así no le avisa de un ícono decorativo de 16 px. |
| Capas sin nombre | Con nombres por defecto de Figma. No toca instancias ni lo que está dentro de ellas. |
| Color sin estilo / casi igual a un estilo | Se separan para no duplicar avisos: «igual» ofrece aplicarlo, «casi igual» (ΔE2000 bajo) lo señala como deriva. |
| Texto sin estilo | Propone el estilo de texto más parecido, y si no hay uno razonable, no fuerza ninguno. |
| Espaciado fuera de escala | Solo gap y padding de auto layout; ignora el espacio automático. |
| Componentes sin estados | Busca una propiedad de estado y revisa hover, foco y deshabilitado (y error en campos). |

### Qué dejé fuera por molesto o por no poder hacerse bien
Estas las descarté yo al construirlo; **[confirme o cambie la lista con sus razones]**:
- **Alineación al píxel y «capas desalineadas»:** ruido puro; casi todo archivo real las tiene a propósito.
- **Capas ocultas olvidadas:** por defecto se omiten; marcarlas como error castiga a quien guarda variantes.
- **Calidad de imágenes (resolución, peso):** requiere leer píxeles; no es lo que quiero que haga un plugin liviano.
- **Espaciado de capas sin auto layout:** no se puede inferir la intención.
- **Texto alternativo / etiquetas accesibles de íconos:** Figma no tiene dónde guardarlo todavía.

### Reglas para no molestar
- Cada regla se apaga en Ajustes y todos los umbrales se editan.
- El puntaje **se explica solo**: resta 10, 5, 2 o 1 por severidad y cada regla pone un tope de 25, para que 500 capas sin nombre no hundan todo el puntaje.
- «Ignorar» se recuerda por archivo, con «Deshacer».
- La severidad nunca es solo color: tiene silueta propia (octágono, triángulo, rombo, círculo) **y** una palabra.

### Por qué la IA solo hace lo que las reglas no pueden
Una regla es mejor que un modelo cuando hay una respuesta medible: el contraste, un múltiplo de 4. La IA entra donde hay que entender sentido:
1. **Proponer nombres** con una convención («Tarjeta / Producto / Precio») a partir de la estructura.
2. **Describir los estados que faltan** según cómo se ven los que ya existen. Solo describe; no crea nada.
3. **Revisar textos**: ortografía, mayúsculas distintas entre botones y mezcla de «tú» y «usted».
4. **Resumir** la revisión en dos o tres frases para el reporte.

Y **no puede inventar hallazgos de las reglas**: un test lo comprueba. Cada respuesta se pide como JSON con esquema, se valida, se reintenta una vez y, si falla, se descarta ese lote sin romper nada.

La clave es del usuario (queda en su equipo), se envían solo nombres, textos y estructura (nunca imágenes), hay caché por archivo, un estimado antes de revisar archivos grandes y un tope de gasto por revisión.

### Una decisión que no esperaba: dos compilaciones
Al revisar las guías de publicación de Figma encontré que **«generalmente no aprueban» plugins que piden la clave de API de otro proveedor de IA**. Así que Repaso tiene una versión **sin IA y sin acceso a red** (la que conviene publicar) y una completa. Un test comprueba que la primera no contiene ni una línea de código de IA. **[Qué decidí publicar y por qué.]**

## 3 · Capturas: antes y después de mis retoques
Generé la interfaz completa con Claude Code, con tokens en un solo archivo y una galería de todos los estados (`npm run preview`). **Lo que sigue es mi trabajo como diseñador sobre lo que generó la IA.**

| Pantalla | Antes (generado) | Después (mis retoques) |
|---|---|---|
| Bienvenida | `docs/assets/antes/welcome.light.png` | **[captura]** |
| Inicio | `antes/home-last.light.png` | **[captura]** |
| Resultados | `antes/results-testfile.light.png` y `.dark.png` | **[captura]** |
| 200 hallazgos | `antes/results-200.light.png` | **[captura]** |
| Lote con vista previa | `antes/batch-rename.light.png` | **[captura]** |
| Sin problemas | `antes/clean.light.png` | **[captura]** |
| Error de clave | `antes/error-ai-key-invalid.light.png` | **[captura]** |
| Ajustes | `antes/settings.light.png` | **[captura]** |
| Estimado de IA | `antes/ai-estimate.light.png` | **[captura]** |

Para sacar las capturas «después»: `npm run screenshots -- --out docs/assets/despues <ids>` (mismos nombres, mismo tamaño, para comparar uno a uno).

**[Qué cambié y por qué: jerarquía, densidad de la fila de hallazgo, el motivo de cuadros, el tono del texto. Aquí está su criterio, que es lo que muestra el caso.]**

### Qué me sorprendió del trabajo con la IA
- Salió bien a la primera lo mecánico (tokens, componentes, estados, teclado).
- Me tocó a mí decidir lo que no se puede medir: qué regla molesta, cuánta información cabe en 560 px de alto, cuándo un aviso es ruido.
- Los errores reales aparecieron al probar en un navegador de verdad: se desbordaba el texto largo de «Ajustes» en 360 px, y Preact 11 ya no agrega «px» a los números en estilos. Los dos están cubiertos ahora por `npm run check:gallery`.

## 4 · Métricas

### Medidas (y reproducibles con `npm run eval:all`)
| Qué | Resultado |
|---|---|
| Pruebas automáticas | 325 en verde |
| Cobertura del motor de reglas | 100 % de líneas, ramas, funciones y sentencias |
| Archivo de prueba con errores a propósito | detecta 11 de 11, sin sobrantes, las 9 reglas |
| Archivo limpio | 0 hallazgos, 100/100 (es un archivo pequeño que hice yo) |
| Rendimiento, 2 000 capas (nodos simulados) | 17 ms en total; el tramo más largo sin ceder el hilo, 8 ms |
| Rendimiento, 20 000 capas (nodos simulados) | 134 ms en total; tramo más largo, 14,6 ms |
| Tamaño del plugin | 47 KB el código y 119 KB la interfaz (versión sin IA: código 47 KB) |

> **Ojo con el rendimiento:** son nodos simulados en Node. En Figma, leer cada propiedad cuesta mucho más, así que el tiempo real será mayor. Lo que sí queda demostrado es que cede el hilo cada ~8 ms. **[Medir en Figma con 2 000 capas reales y poner el número aquí.]**

### Pendientes (necesitan una clave de Anthropic; no se inventan)
| Qué | Cómo se mide |
|---|---|
| % de nombres de capa aceptables o buenos | `npm run eval:names`, calificar 1–3 en `evals/names-tabla.md`, `-- --score` |
| Detección de textos con errores y falsas alarmas | `npm run eval:copy -- --runs 3` (7 errores insertados) |
| Costo real por revisión | lo imprimen los dos scripts |

Con 80 capas el costo estimado es menor a 0,01 USD con el modelo económico. **[Pegar aquí las cifras reales de `evals/reporte.md` cuando las corra.]**

## 5 · Video del flujo
`docs/assets/video/flujo.webm` (25 s): revisar → ver por qué ese puntaje → ir a una capa → filtrar por categoría → corregir en lote con vista previa (quitando una casilla) → exportar el reporte a Markdown. Está grabado sobre la demo interactiva (`npm run preview` → `/demo.html`), que es la interfaz real conectada a un plugin simulado con el motor real. Para grabar otra versión: `node scripts/record-demo.mjs [--dark] [--ai]`.

**[Cuando lo tenga, regrabe el video dentro de Figma con el archivo de prueba: es lo que van a querer ver.]**

## 6 · Lo que aprendí y lo que haría distinto
**Lo que aprendí**
- Un plugin vive en dos mundos: el hilo principal con la API y un iframe con la interfaz, que solo hablan por mensajes. Separar la lógica pura (lectura → motor → correcciones) fue lo que permitió probarlo todo sin abrir Figma.
- La salida estructurada (JSON con esquema) cambia la conversación con un modelo: se valida como cualquier entrada de un usuario, y lo que no pasa se descarta.
- Para que la IA no se sienta un gasto: lotes, caché, estimado y tope. El costo se diseña, no se descubre en la factura.
- Una guía de revisión se lee **antes** de construir, no después: la regla de la clave de IA me habría ahorrado una semana de dudas.

**Lo que haría distinto**
- Empezaría por la versión sin IA como producto y agregaría la IA como una extensión aparte.
- Probaría en Figma desde la fase 1 (aquí lo simulé todo; `docs/verificacion-manual.md` es la deuda).
- Escribiría las pruebas de interfaz en un navegador desde el primer componente: los desbordes se ven en segundos con `check:gallery`, no con ojo.

**[Lo que haría distinto como diseñador.]**
