// Revisa la galería en un navegador real: sin errores de consola, sin desborde horizontal,
// y con el teclado se llega a controles con foco visible. Uso: node scripts/check-gallery.mjs
import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
await mkdir('preview-dist', { recursive: true });
await cp('preview/index.html', 'preview-dist/index.html');
await build({ entryPoints: { preview: 'preview/index.tsx' }, outdir: 'preview-dist', bundle: true, format: 'iife', target: 'es2020', jsx: 'automatic', jsxImportSource: 'preact', logLevel: 'error' });

const base = pathToFileURL(path.resolve('preview-dist/index.html')).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(base);
const ids = await page.$$eval('[data-screen][data-theme="light"]', (els) => els.map((e) => e.getAttribute('data-screen')));
let problems = 0;
for (const id of ids) {
  for (const size of ['320x440', '360x560', '480x700']) {
    await page.goto(`${base}?only=${id}&size=${size}`);
    await page.waitForSelector(`[data-screen="${id}"]`);
    const r = await page.$eval(`[data-screen="${id}"]`, (f) => {
      const wide = f.classList.contains('pv-wide') || f.firstElementChild?.classList.contains('pv-wide');
      const over = [...f.querySelectorAll('*')].filter((el) => !el.closest('.rp-tabs, .rp-batchbar__buttons, .rp-export__text, pre') && el.getBoundingClientRect().right > f.getBoundingClientRect().right + 1 && getComputedStyle(el).position !== 'absolute');
      return { wide, over: over.slice(0, 3).map((e) => `${e.tagName}.${e.className}`) };
    });
    if (!r.wide && r.over.length) {
      problems++;
      console.log(`✗ ${id} @${size}: desborde horizontal →`, r.over.join(', '));
    }
  }
}

// Teclado: en Resultados, Tab debe llegar a «Corregir» con foco visible.
await page.goto(`${base}?only=results-testfile&theme=light`);
await page.waitForSelector('[data-screen]');
let sawFix = false, visible = true;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    const cs = getComputedStyle(a);
    return { text: a.textContent?.trim().slice(0, 20), ring: cs.boxShadow !== 'none' || cs.outlineStyle !== 'none' };
  });
  if (info && !info.ring) visible = false;
  if (info?.text === 'Corregir') sawFix = true;
}
console.log(`Teclado: llega a «Corregir» → ${sawFix ? 'sí' : 'NO'}; foco visible en todos → ${visible ? 'sí' : 'NO'}`);
if (!sawFix || !visible) problems++;
if (errors.length) { problems++; console.log('Errores de consola:', [...new Set(errors)].slice(0, 5)); }
console.log(problems ? `✗ ${problems} problema(s)` : `✓ ${ids.length} pantallas × 3 tamaños sin problemas`);
await browser.close();
process.exit(problems ? 1 : 0);
