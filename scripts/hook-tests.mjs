// Hook de Claude Code: al editar un archivo de src/, corre las pruebas relacionadas.
// Lee el JSON del evento por stdin. Si fallan, sale con código 2 para avisar a Claude.
import { spawnSync } from 'node:child_process';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let file = '';
try {
  const input = JSON.parse(raw);
  file = input?.tool_input?.file_path ?? '';
} catch {
  process.exit(0);
}
if (!/[\\/](src|tests|fixtures)[\\/].*\.(ts|tsx|json)$/.test(file)) process.exit(0);

const args = file.includes('.test.')
  ? ['vitest', 'run', file]
  : ['vitest', 'related', '--run', '--passWithNoTests', file];
const r = spawnSync('npx', args, { encoding: 'utf8' });
if (r.status !== 0) {
  process.stderr.write(`Pruebas relacionadas con ${file} fallaron:\n${r.stdout}\n${r.stderr}`);
  process.exit(2);
}
