// Galería de estados: sirve preview/index.html con recarga automática.
import { context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

const port = Number(process.env.PORT ?? 5173);
await mkdir('preview-dist', { recursive: true });
await cp('preview/index.html', 'preview-dist/index.html');

const ctx = await context({
  entryPoints: { preview: 'preview/index.tsx' },
  outdir: 'preview-dist',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'css' },
  sourcemap: true,
  logLevel: 'info',
});
await ctx.watch();
const { hosts, port: p } = await ctx.serve({ servedir: 'preview-dist', port });
console.log(`Galería de estados en http://localhost:${p}  (${hosts.join(', ')})`);
