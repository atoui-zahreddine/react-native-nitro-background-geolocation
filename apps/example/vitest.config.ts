import { defineConfig } from 'vitest/config';

// Only the pure-TS tracking pipeline is unit-tested; screens and native
// integration are exercised on-device.
export default defineConfig({
  test: {
    include: ['src/lib/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
