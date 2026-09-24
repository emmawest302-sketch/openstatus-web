import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Only src/ is the app.
 *
 * With no config, vitest walked the whole repo — including `_to_delete/`,
 * where retired code is parked before it is removed for good. Those files kept
 * their tests, so the suite went on reporting green for behaviour the product
 * no longer has, and the headline number counted work that had been deleted.
 * A passing test for code nothing imports is worse than no test: it reads as
 * coverage.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '_to_delete/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
