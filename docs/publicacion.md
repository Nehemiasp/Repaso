# Publicar Repaso en la comunidad de Figma

Requisitos consultados el 2026-11-08 en la ayuda de Figma («Publish plugins to the Figma Community») y en sus guías de revisión. **El modal de publicar manda**: si pide algo distinto, haga caso al modal y corrija este documento.

## ⚠️ Lo primero: el riesgo de la clave de IA

Las guías de revisión de Figma dicen que **«generalmente no aprueban»** plugins que se solapan con su propia IA, y lo extienden a los que **«permiten traer la propia clave de API de otros proveedores de IA»**. Repaso con IA pide la clave de Anthropic del usuario: puede caer en esa regla, aunque su uso es acotado (cuatro tareas, no un chat).

Por eso hay **dos compilaciones**:

| | `npm run build` (completa) | `npm run build:community` (sin IA) |
|---|---|---|
| Carpeta | `dist/` | `dist-community/` (con su propio `manifest.json`) |
| IA y clave | sí | **no hay código de IA** (lo verifica `tests/build.test.ts`) |
| Red | solo `api.anthropic.com` | **ninguna** (`allowedDomains: ["none"]`) → etiqueta «No network access» |
| Riesgo de revisión | alto | bajo |

**Recomendación:** envíe primero la versión **sin IA**. Es útil por sí sola (las 9 reglas, correcciones en lote, exportar), no necesita política de datos de terceros y se aprueba con menos fricción. La versión completa queda en el repositorio para quien la instale desde el manifiesto (y para su caso de estudio).

**No** publique dos listados del mismo plugin: «listados duplicados con la misma funcionalidad» es otro motivo de rechazo. Si más adelante quiere la IA en la comunidad, escriba a Figma (formulario de contacto de la guía de revisión) y pregunte si una clave propia para cuatro tareas acotadas es aceptable; adjunte `docs/privacidad.md`.

Qué cambia en la ficha si publica la versión sin IA: use `docs/store-es.md` / `store-en.md` **sin** los párrafos marcados «(solo versión con IA)», y retoque la portada para quitar las etiquetas «IA» de la vista previa del lote (`docs/assets/src/cover.html`, o use otra captura).

## Requisitos de la ficha

| Campo | Requisito | Dónde está |
|---|---|---|
| Nombre | obligatorio | «Repaso» (verifique abajo) |
| Eslogan | obligatorio, sin límite indicado | `store-es.md` / `store-en.md` |
| Descripción | qué hace y sus funciones | `store-es.md` / `store-en.md` |
| Ícono | recomendado **128 × 128 px** | `docs/assets/icon-128.png` (y `icon-512.png`) |
| Portada | imagen o video, recomendado **1920 × 1080 px** | `docs/assets/cover-es-1920x1080.png`, `cover-en-…` |
| Carrusel | opcional, hasta 9 imágenes o videos | `docs/assets/screens/` (genere más con `npm run screenshots`) |
| Categoría | una (por ejemplo «Design tools») | Design tools |
| Etiquetas | la ayuda actual **no las menciona**; si el modal las pide: | `accessibility`, `contrast`, `audit`, `lint`, `naming`, `design-system`, `a11y`, `spanish` |
| Contacto de soporte | **obligatorio** | un correo o página suya que atienda |
| Etiqueta de acceso a red | automática desde el manifiesto: «Restricted» (completa) o «No network access» (sin IA) | `manifest.json` |
| Formulario de seguridad | opcional, **recomendado**; Figma lo revisa (hasta ~2 semanas) | respuestas sugeridas abajo |
| Política de privacidad | obligatoria si el plugin procesa datos del usuario | `docs/privacidad.md` → publíquela en su portafolio |
| Plugin gratuito | sí: no active precios | — |

Además, de las guías de revisión:
- La ficha debe describir con exactitud lo que hace, con capturas, y enlazar documentación de uso.
- Si hace falta una cuenta de terceros (la clave de Anthropic), **debe decirse claro en la descripción**.
- No mostrar errores técnicos al usuario final (los de la IA van en un «Detalle técnico» plegado, con mensaje claro arriba).
- No anuncios, no procesos largos que degraden Figma (la lectura es por trozos de ~8 ms y cancelable).
- Solo APIs oficiales de plugins.

## Antes de enviar

- [ ] **Nombre:** busque «Repaso» en figma.com/community/plugins. La búsqueda web no indexa la comunidad, así que no pude confirmarlo. Reserva: «Cuadre».
- [ ] Recorra `docs/verificacion-manual.md` completo en la app de escritorio, con tema claro y oscuro.
- [ ] `npm test` y `npm run check:gallery` en verde.
- [ ] Probado en un archivo grande y en uno vacío (los dos errores salen claros).
- [ ] Publique `docs/privacidad.md` en su portafolio y use esa URL.
- [ ] Retoques visuales hechos (`RETOQUES.md`) y portada/ícono finales.
- [ ] Ficha lista en español e inglés.
- [ ] Una cuenta de Figma con **verificación en dos pasos** activada, y la **app de escritorio** (macOS o Windows): solo se puede enviar desde ahí.

## Pasos para enviarlo a revisión (los hace usted)

1. Elija la compilación (recomendada: sin IA):
   ```bash
   npm run build:community   # genera dist-community/
   ```
   Para probarla antes en Figma: Plugins → Development → Import plugin from manifest… → `dist-community/manifest.json`.
2. En la app de escritorio: **Plugins → Manage plugins → Publish** (o menú del plugin en desarrollo → Publish).
3. Figma le asigna el **ID real** del plugin. Cópielo al campo `id` del `manifest.json` de la raíz (ahora vale `0000000000000000000`) y reconstruya, para que el siguiente envío sea una actualización y no un plugin nuevo.
4. Suba **ícono** (`icon-128.png`), **portada** (`cover-es-1920x1080.png`), carrusel y escriba **nombre, eslogan y descripción** (`store-es.md`; la ficha en inglés si Figma ofrece varios idiomas, o publique en inglés y ponga el español en la descripción).
5. Elija **categoría** y **etiquetas**, y escriba el **contacto de soporte**.
6. Revise la **etiqueta de red** que Figma calculó (debe decir «No network access» en la versión sin IA).
7. En «Security disclosure», conteste (opcional, pero ayuda):
   - *¿Qué datos del usuario lee?* Estructura y propiedades de las capas de la selección o la página que el usuario elige revisar: nombres, tipos, tamaños, rellenos, textos, auto layout, estilos y componentes. No lee comentarios, ni otras páginas, ni imágenes.
   - *¿Envía datos fuera de Figma?* Versión sin IA: no. Versión con IA: solo si el usuario la activa y pone su propia clave; envía nombres de capas, textos y estructura a `api.anthropic.com`; nunca imágenes.
   - *¿Dónde guarda cosas?* La clave y los ajustes, en `figma.clientStorage` del equipo del usuario; los hallazgos ignorados y la caché de la IA, como datos del plugin dentro del propio archivo. No hay servidor propio ni base de datos.
   - *¿Modifica el archivo?* Solo cuando el usuario pulsa «Aplicar» tras ver la vista previa; cada lote se deshace con un solo Ctrl+Z.
8. Envíe. Aparecerá como «In review»; Figma avisa por correo. Los tiempos varían (la ayuda no promete plazo). Puede seguir subiendo actualizaciones durante la revisión.
9. Si lo rechazan, responda al motivo concreto y reenvíe. Si el motivo es la clave de IA, ya tiene la versión sin IA.

## Después de publicar
- Actualizaciones: `npm run build:community`, suba, y escriba notas de versión.
- Cambie `APP_VERSION` en `src/shared/constants.ts` y en `package.json`.
