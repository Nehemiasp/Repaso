import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/**/*.test.ts', 'src/engine/**/index.ts'],
      // Regla del proyecto: el motor de reglas se prueba al 100 %.
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
