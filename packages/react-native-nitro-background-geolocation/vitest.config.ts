import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `__DEV__` is injected by Metro at runtime; tests run outside it.
  define: { __DEV__: 'true' },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
