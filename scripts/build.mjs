// Construye el plugin: dist/code.js (hilo principal) y dist/ui.html (UI en un solo archivo).
import { build, context } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
// --no-ai: compilación «comunidad» (sin código de IA ni red). --out <dir>: carpeta de salida.
const noAi = process.argv.includes('--no-ai');
const outIdx = process.argv.indexOf('--out');
const OUT = outIdx >= 0 ? process.argv[outIdx + 1] : noAi ? 'dist-community' : 'dist';
await mkdir(OUT, { recursive: true });
const define = { __AI__: noAi ? 'false' : 'true' };

// En la compilación sin IA se pliegan las constantes para que el código de IA se elimine del paquete.
const common = { bundle: true, logLevel: 'info', legalComments: 'none', define, minifySyntax: noAi };

const codeOptions = {
  ...common,
  entryPoints: ['src/plugin/main.ts'],
  outfile: `${OUT}/code.js`,
  format: 'iife',
  target: 'es2019',
  platform: 'neutral',
};

const uiOptions = {
  ...common,
  entryPoints: { ui: 'src/ui/index.tsx' },
  outdir: `${OUT}/.ui`,
  format: 'iife',
  target: 'es2019',
  minify: !watch,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'css' },
};

async function inlineUi() {
  const [js, css] = await Promise.all([
    readFile(`${OUT}/.ui/ui.js`, 'utf8'),
    readFile(`${OUT}/.ui/ui.css`, 'utf8').catch(() => ''),
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
  await writeFile(`${OUT}/ui.html`, html);
  if (noAi) await writeCommunityManifest();
}

/** Manifiesto de la versión sin IA: sin acceso a red. */
async function writeCommunityManifest() {
  const m = JSON.parse(await readFile('manifest.json', 'utf8'));
  m.main = 'code.js';
  m.ui = 'ui.html';
  m.networkAccess = { allowedDomains: ['none'] };
  await writeFile(`${OUT}/manifest.json`, JSON.stringify(m, null, 2) + '\n');
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
