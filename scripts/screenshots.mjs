// Capturas de la galería de estados. Uso: node scripts/screenshots.mjs [--scale 2] [--out docs/assets/screens] [--size 320x440] [--theme dark] [--scroll 700] [id…]
// Sin ids, captura todas las pantallas en claro y oscuro.
import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const scale = Number(opt('scale', 1));
const out = opt('out', 'docs/assets/screens');
const size = opt('size', '');
const themesArg = opt('theme', '');
const scroll = Number(opt('scroll', 0));
const skip = new Set(['--scale', opt('scale', ''), '--out', opt('out', ''), '--size', size, '--theme', themesArg, '--scroll', String(scroll || '')]);
const ids = args.filter((a) => !skip.has(a) && !a.startsWith('--'));

await mkdir('preview-dist', { recursive: true });
await cp('preview/index.html', 'preview-dist/index.html');
await build({
  entryPoints: { preview: 'preview/index.tsx' },
  outdir: 'preview-dist',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  logLevel: 'error',
});
await mkdir(out, { recursive: true });

const base = pathToFileURL(path.resolve('preview-dist/index.html')).href;
const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: scale, viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('Error de página:', e.message));

await page.goto(base);
const all = await page.$$eval('[data-screen][data-theme="light"]', (els) => els.map((e) => e.getAttribute('data-screen')));
const list = ids.length ? ids : all;

for (const id of list) {
  for (const theme of themesArg ? [themesArg] : ['light', 'dark']) {
    await page.goto(`${base}?only=${id}&theme=${theme}${size ? `&size=${size}` : ''}`);
    await page.waitForSelector(`[data-screen="${id}"]`);
    if (scroll) await page.evaluate((y) => document.querySelector('.rp-screen__body')?.scrollTo(0, y), scroll);
    await page.waitForTimeout(250); // deja terminar las transiciones de entrada
    const el = await page.$(`[data-screen="${id}"]`);
    await el.screenshot({ path: path.join(out, `${id}.${theme}.png`) });
  }
  console.log('✓', id);
}
await browser.close();
