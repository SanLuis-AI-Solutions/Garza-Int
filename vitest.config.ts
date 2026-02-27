import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['domain/strategies/**/*.ts', 'services/**/*.ts'],
      exclude: ['**/*.d.ts'],
    },
  },
});
