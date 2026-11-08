# Repaso

Plugin de Figma que revisa su selección o página y señala lo que un buen diseño no debería tener (contraste, texto pequeño, áreas táctiles, capas sin nombre, estilos, espaciado, componentes sin estados y textos), con la corrección a un clic cuando se puede.

Proyecto de [Nehemias Pérez](https://nehemiasperez.com) · sección «Laboratorio».

```bash
npm install
npm run build      # genera dist/
npm test
npm run preview    # galería de estados en el navegador
```

```bash
npm run build:community   # versión sin IA ni red (la recomendada para publicar)
npm run check:gallery     # revisa las 42 pantallas en un navegador real
npm run eval:all          # evaluación de reglas y rendimiento → evals/reporte.md
```

- Cómo cargarlo en Figma: `CLAUDE.md` → «Cargar el plugin en Figma».
- Dónde retocar lo visual: `RETOQUES.md`.
- Publicarlo: `docs/publicacion.md` (⚠️ lea primero el riesgo de la clave de IA).
- **Probarlo en Figma, paso a paso: `docs/guia-de-prueba.md`** (con plantilla de informe). La lista corta está en `docs/verificacion-manual.md`.
- Caso de estudio: `docs/caso-de-estudio.md`.
