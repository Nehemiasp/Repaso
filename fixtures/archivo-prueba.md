# Archivo de prueba para Figma (errores a propósito)

> **Ya está armado:** [Repaso · Archivo de prueba](https://www.figma.com/design/gedqxnqIPVgos61H09BRvx) (en su plan «Personal»). Abra el archivo en la app de escritorio, seleccione el marco **«Archivo de prueba»** y revise: deben salir **11 hallazgos y 68/100**. Se comprobó corriendo el lector y el motor reales de Repaso dentro de Figma. Lo de abajo explica cómo está hecho, por si quiere rehacerlo o ampliarlo.

Arme este archivo en Figma para probar Repaso de punta a punta. Equivale a `fixtures/archivo-prueba.json`, que usan las pruebas automáticas. **No use material de clientes ni de NIU.**

## 1. Preparación (una sola vez)
1. Cree un archivo nuevo, una página «Archivo de prueba» y un frame **«Archivo de prueba»** de 390 × 1400, relleno blanco.
2. Cree estos **estilos de color**: `Marca/Azul` #043565 · `Texto/Principal` #111111 · `Fondo/Blanco` #FFFFFF · `Fondo/Gris` #F2F4F7 · `Texto/Gris claro` #B0B0B0 (solo para E01).
3. Cree estos **estilos de texto** (Inter): `Cuerpo` 16 Regular · `Título` 24 Bold · `Etiqueta` 12 Medium · `Nota` 11 Regular (solo para E02: un texto con estilo no puede medir 11 px si el estilo mide otra cosa).
4. Dentro del frame, apile 11 tarjetas (frames de 358 × 120, auto layout vertical, gap 8, padding 16, relleno `Fondo/Blanco`). Nómbrelas como abajo. **Todo lo que no sea el error de cada tarjeta debe llevar estilo** (texto con estilo `Cuerpo`, color con estilo `Texto/Principal`).

## 2. Un error por regla

| Tarjeta | Regla | Qué construir | Qué debe decir Repaso |
|---|---|---|---|
| E01 · Contraste | `contrast` | Texto «Texto gris claro» con color #B0B0B0 (use un color vinculado a estilo para que solo falle el contraste) | Contraste insuficiente (~2,1:1), **crítica** |
| E01b · Contraste sobre imagen | `contrast` | Rectángulo con relleno de imagen detrás de un texto; la tarjeta sin relleno | **«No se pudo verificar»**, nunca aprobado |
| E02 · Texto pequeño | `text-small` | Texto de 11 px | Texto muy pequeño (11 px), media |
| E03 · Área táctil | `touch-target` | Instancia «Botón / Principal» de 32 × 24 con propiedad `State` | Área táctil de 32 × 24 px, alta |
| E04 · Capas sin nombre | `layer-default-name` | Un frame llamado «Frame 482» (auto layout horizontal, con un texto) y un rectángulo «Rectangle 12» | 2 capas sin nombre; sugiere «Fila» y «Rectángulo» |
| E05 · Relleno sin estilo | `fill-no-style` | Rectángulo con relleno #FF8800 sin estilo | Color #FF8800 sin estilo, media |
| E06 · Color casi igual | `color-near-style` | Rectángulo con relleno #073A6A (casi `Marca/Azul`) | Casi igual a «Marca/Azul», baja, con corrección |
| E07 · Texto sin estilo | `text-no-style` | Texto de 16 px **sin** estilo de texto | Texto sin estilo; sugiere «Cuerpo» |
| E08 · Espaciado fuera de escala | `spacing-off-scale` | Tarjeta con gap 13 y padding superior 10 | gap 13 → 12, relleno sup. 10 → 12 (rejilla de 4) |
| E09 · Componente sin estados | `component-missing-states` | Set de componentes «Botón» con propiedad `Estado` = Normal, Hover | Faltan estados: foco, deshabilitado, alta |

## 3. Resultado esperado
Con los ajustes por defecto (rejilla 4, contraste AA, texto mínimo 12, área táctil 44), la revisión da **11 hallazgos**: los de la tabla (E01b cuenta como «no verificable»). Si encuentra más, revise primero que todo lo demás lleve estilo.

## 4. Archivo limpio
Un frame «Pantalla / Inicio» con título, cuerpo, un botón con relleno `Marca/Azul`, todo con estilos y espaciados múltiplos de 4, y un set «Botón» con Normal, Hover, Foco y Deshabilitado, debe dar **100 puntos y cero hallazgos**.

## 5. Textos con errores (para la IA, fase 4–5)
Copie los textos de `fixtures/textos-con-errores.json`: tres con faltas de ortografía, dos con tuteo (el ajuste es «usted») y tres botones con mayúsculas inconsistentes («Guardar», «CANCELAR», «aceptar»). La lista `expected` indica qué debe detectar la IA.
