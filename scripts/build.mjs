// Construye el plugin: dist/code.js (hilo principal) y dist/ui.html (UI en un solo archivo).
import { build, context } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
await mkdir('dist', { recursive: true });

const common = { bundle: true, logLevel: 'info', legalComments: 'none' };

const codeOptions = {
  ...common,
  entryPoints: ['src/plugin/main.ts'],
  outfile: 'dist/code.js',
  format: 'iife',
  target: 'es2019',
  platform: 'neutral',
};

const uiOptions = {
  ...common,
  entryPoints: { ui: 'src/ui/index.tsx' },
  outdir: 'dist/.ui',
  format: 'iife',
  target: 'es2019',
  minify: !watch,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'css' },
};

async function inlineUi() {
  const [js, css] = await Promise.all([
    readFile('dist/.ui/ui.js', 'utf8'),
    readFile('dist/.ui/ui.css', 'utf8').catch(() => ''),
  ]);
  // El cierre de </script> dentro del JS rompería el HTML.
  const safeJs = js.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Repaso</title>
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<script>${safeJs}</script>
</body>
</html>
`;
  await writeFile('dist/ui.html', html);
}

const inlinePlugin = {
  name: 'inline-ui',
  setup(b) {
    b.onEnd(async () => {
      await inlineUi();
    });
  },
};

if (watch) {
  const c1 = await context(codeOptions);
  const c2 = await context({ ...uiOptions, plugins: [inlinePlugin] });
  await Promise.all([c1.watch(), c2.watch()]);
  console.log('Vigilando cambios…');
} else {
  await build(codeOptions);
  await build({ ...uiOptions, plugins: [inlinePlugin] });
}
