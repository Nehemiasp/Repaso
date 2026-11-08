// Graba el video corto del flujo (revisar → corregir en lote → exportar) sobre la demo interactiva.
// Uso: node scripts/record-demo.mjs [--dark] [--ai]   → docs/assets/video/flujo[-oscuro][-ia].webm
import { build } from 'esbuild';
import { cp, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const dark = process.argv.includes('--dark');
const ai = process.argv.includes('--ai');
const name = `flujo${dark ? '-oscuro' : ''}${ai ? '-ia' : ''}.webm`;

await mkdir('preview-dist', { recursive: true });
await cp('preview/demo.html', 'preview-dist/demo.html');
await build({ entryPoints: { demo: 'preview/demo.tsx' }, outdir: 'preview-dist', bundle: true, format: 'iife', target: 'es2020', jsx: 'automatic', jsxImportSource: 'preact', logLevel: 'error' });

const tmp = 'docs/assets/video/.tmp';
await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 560, height: 840 }, recordVideo: { dir: tmp, size: { width: 560, height: 840 } } });
const page = await ctx.newPage();
const q = `?${dark ? 'theme=dark&' : ''}${ai ? 'ai=1&' : ''}`;
await page.goto(pathToFileURL(path.resolve('preview-dist/demo.html')).href + q);
const wait = (ms) => page.waitForTimeout(ms);

await page.getByRole('button', { name: 'Revisar', exact: true }).waitFor();
await wait(1400);
await page.getByRole('button', { name: 'Revisar', exact: true }).click();                 // 1 · revisar
await page.getByRole('heading', { name: 'Resultados' }).waitFor({ timeout: 10000 });
await wait(2200);
await page.getByRole('button', { name: /¿Por qué este puntaje/ }).click();                 // el puntaje se explica solo
await wait(2000);
await page.getByRole('button', { name: /¿Por qué este puntaje/ }).click();
await page.locator('.rp-row__main').first().hover();
await wait(900);
await page.locator('.rp-row__main').first().click();                                       // selecciona la capa
await wait(1200);
await page.getByRole('tab', { name: /Accesibilidad/ }).click();                            // filtra por categoría
await wait(1400);
await page.getByRole('tab', { name: /Todas/ }).click();
await wait(700);
await page.getByRole('button', { name: /Renombrar/ }).click();                             // 2 · corregir en lote
await page.getByRole('dialog').waitFor();
await wait(2200);
await page.getByRole('dialog').getByRole('checkbox').nth(2).uncheck({ force: true });      // quita una casilla
await wait(1400);
await page.getByRole('button', { name: /Aplicar \d+ cambio/ }).click();
await page.getByText(/Ctrl\+Z los deshace/).waitFor({ timeout: 10000 });
await wait(2200);
await page.getByRole('button', { name: 'Exportar' }).click();                              // 3 · exportar
await page.getByRole('heading', { name: 'Exportar reporte' }).waitFor();
await wait(2000);
await page.getByRole('button', { name: 'Copiar Markdown' }).click();
await wait(2200);
await ctx.close();
await browser.close();

const [file] = (await readdir(tmp)).filter((f) => f.endsWith('.webm'));
await rename(path.join(tmp, file), path.join('docs/assets/video', name));
await rm(tmp, { recursive: true, force: true });
console.log('Video:', path.join('docs/assets/video', name));
