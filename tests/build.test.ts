// Pruebas de arquitectura y privacidad del paquete: lo que el manifiesto promete es lo que el código hace.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');
/** Rutas con `/` en cualquier sistema (en Windows el separador es `\`). */
const posix = (p: string) => p.split(path.sep).join('/');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? (n === 'node_modules' ? [] : walk(p)) : [p];
  });

describe('manifest.json', () => {
  const m = JSON.parse(read('manifest.json'));
  it('usa el modo de acceso a documentos que exige Figma y solo permite el dominio de la API', () => {
    expect(m.documentAccess).toBe('dynamic-page');
    expect(m.networkAccess.allowedDomains).toEqual(['https://api.anthropic.com']);
    expect(m.networkAccess.reasoning).toBeTruthy();
    expect(m.main).toBe('dist/code.js');
    expect(m.ui).toBe('dist/ui.html');
  });
});

describe('arquitectura en capas', () => {
  const files = (dir: string) => walk(path.join(root, dir)).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
  it('el motor de reglas y la IA no usan la API de Figma', () => {
    for (const f of [...files('src/engine'), ...files('src/ai')]) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/\bfigma\./);
    }
  });
  it('el motor no importa nada de lectura, correcciones, IA, plugin ni interfaz', () => {
    for (const f of files('src/engine')) {
      const imports = [...readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
      for (const i of imports) expect(i, f).not.toMatch(/\/(read|fixes|ai|plugin|ui)(\/|$)/);
    }
  });
  it('la interfaz no usa la API de Figma ni importa el hilo principal', () => {
    // Los textos de i18n mencionan «figma.clientStorage» como explicación, no como uso.
    for (const f of files('src/ui').filter((x) => !posix(x).includes('/i18n/'))) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/\bfigma\./);
      expect(src, f).not.toMatch(/from '\.\.\/(\.\.\/)?plugin/);
    }
  });
});

describe('claves', () => {
  it('no hay ninguna clave de Anthropic escrita en el repositorio', () => {
    const skip = /(^|\/)(node_modules|dist|dist-community|preview-dist|coverage|\.git)(\/|$)/;
    const hits: string[] = [];
    for (const f of walk(root)) {
      if (skip.test(posix(path.relative(root, f))) || /\.(png|jpg|webm|woff2?)$/.test(f)) continue;
      if (/sk-ant-[A-Za-z0-9_-]{20,}/.test(readFileSync(f, 'utf8'))) hits.push(posix(path.relative(root, f)));
    }
    expect(hits).toEqual([]);
  });
});

describe('estilos', () => {
  it('ningún componente ni pantalla tiene colores o píxeles escritos en el código', () => {
    const ok = /^(?:\s*\/\/|\s*\*|.*aria-|.*viewBox|.*stroke-width)/;
    const bad: string[] = [];
    for (const f of walk(path.join(root, 'src/ui')).filter((p) => /\.tsx$/.test(p) && !/\.test\./.test(p) && !/Icon\.tsx$/.test(p))) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (ok.test(line)) return;
        if (/#[0-9a-fA-F]{6}\b|rgba?\(/.test(line)) bad.push(`${posix(path.relative(root, f))}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(bad).toEqual([]);
  });
});

describe('versión comunidad (sin IA)', () => {
  const out = mkdtempSync(path.join(tmpdir(), 'repaso-community-'));
  execFileSync('node', ['scripts/build.mjs', '--no-ai', '--out', out], { cwd: root, stdio: 'pipe' });
  it('no contiene código ni dominios de IA y su manifiesto no tiene acceso a red', () => {
    const code = readFileSync(path.join(out, 'code.js'), 'utf8');
    expect(code).not.toMatch(/api\.anthropic\.com|x-api-key|anthropic-dangerous/);
    const m = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    expect(m.networkAccess.allowedDomains).toEqual(['none']);
    expect(m).toMatchObject({ main: 'code.js', ui: 'ui.html', documentAccess: 'dynamic-page' });
    const ui = readFileSync(path.join(out, 'ui.html'), 'utf8');
    // La sección de clave de Ajustes (componente) no está; los textos de i18n sí pueden estar.
    expect(ui).not.toContain('"rp-key"');
  });
  it('la versión completa sí los tiene', () => {
    const full = mkdtempSync(path.join(tmpdir(), 'repaso-full-'));
    execFileSync('node', ['scripts/build.mjs', '--out', full], { cwd: root, stdio: 'pipe' });
    expect(readFileSync(path.join(full, 'code.js'), 'utf8')).toContain('https://api.anthropic.com/v1/messages');
    expect(readFileSync(path.join(full, 'ui.html'), 'utf8')).toContain('"rp-key"');
  });
});
