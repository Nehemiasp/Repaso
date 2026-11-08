import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient, type FetchLike } from '../src/ai';

export const RESULTS = 'evals/results';

export function save(name: string, data: unknown): void {
  mkdirSync(RESULTS, { recursive: true });
  writeFileSync(path.join(RESULTS, `${name}.json`), JSON.stringify(data, null, 2) + '\n');
}

export function load<T>(name: string): T | null {
  try {
    return JSON.parse(readFileSync(path.join(RESULTS, `${name}.json`), 'utf8')) as T;
  } catch {
    return null;
  }
}

export function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? 'true') : fallback;
}

export const flag = (name: string) => process.argv.includes(`--${name}`);

export const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

/** Cliente real para las evaluaciones con IA. Pide la clave por entorno: nunca se escribe en un archivo. */
export function realClient(model: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Falta ANTHROPIC_API_KEY. Ejemplo:\n  ANTHROPIC_API_KEY=sk-ant-… npm run eval:names\nSin clave, use --dry para ver el estimado de costo.');
    process.exit(2);
  }
  return createClient({ apiKey, model, fetchFn: fetch as unknown as FetchLike });
}
