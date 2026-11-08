// Genera el ícono (128 y 512) y la portada (1920×1080, ES y EN) de la ficha de la comunidad.
// Uso: node scripts/make-assets.mjs   · Fuentes editables: docs/assets/src/icon.html y cover.html
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = 'docs/assets';

// Capturas de la interfaz a doble resolución para la portada.
execFileSync('node', ['scripts/screenshots.mjs', '--scale', '2', '--out', `${out}/screens`, 'results-testfile', 'batch-rename'], { stdio: 'inherit' });

const url = (f, q = '') => pathToFileURL(path.resolve(out, 'src', f)).href + q;
const abs = (f) => pathToFileURL(path.resolve(out, 'screens', f)).href;
const browser = await chromium.launch();

for (const [scale, name] of [[1, 'icon-128.png'], [4, 'icon-512.png']]) {
  const ctx = await browser.newContext({ deviceScaleFactor: scale, viewport: { width: 128, height: 128 } });
  const p = await ctx.newPage();
  await p.goto(url('icon.html'));
  await (await p.$('#icon')).screenshot({ path: path.join(out, name), omitBackground: true });
  await ctx.close();
}

for (const lang of ['es', 'en']) {
  const ctx = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const q = `?lang=${lang}&a=${encodeURIComponent(abs('results-testfile.light.png'))}&b=${encodeURIComponent(abs('batch-rename.dark.png'))}`;
  await p.goto(url('cover.html', q));
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await (await p.$('#cover')).screenshot({ path: path.join(out, `cover-${lang}-1920x1080.png`) });
  await ctx.close();
}
await browser.close();
console.log('Ícono y portadas listos en', out);
