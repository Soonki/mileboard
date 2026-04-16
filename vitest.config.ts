import { defineConfig } from 'vitest/config';

// Pin the test timezone so timezone-sensitive snapshots (e.g. toIsoLocal()
// which embeds the local TZ offset) are stable across developer machines
// and CI runners. Must be set before any Date operation.
process.env.TZ = 'Asia/Tokyo';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    globals: true,
  },
});
