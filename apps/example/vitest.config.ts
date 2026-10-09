import { defineConfig } from 'vitest/config';

// Only the pure-TS tracking pipeline is unit-tested; screens and native
// integration are exercised on-device.
export default defineConfig({
  // Load the library from source, as Metro does, so tests see the current
  // Config Contract without a library build. Dedupe so the library's
  // react-native import hits the test's mock, not its own Flow copy.
  resolve: { dedupe: ['react-native', 'react-native-nitro-modules'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: {
    include: ['src/lib/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
