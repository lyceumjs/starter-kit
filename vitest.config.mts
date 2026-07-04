import { fileURLToPath } from 'node:url'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Integration tests boot a real Payload instance against a dedicated Postgres database
// (DATABASE_URI is overridden to `lms_test` by `make test`). Follows the official
// Payload 3.x template convention (research D6).
const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Resolve the `@/*` and `@payload-config` path aliases from tsconfig.json.
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    setupFiles: [path.resolve(dirname, './vitest.setup.ts')],
    // `payload-oauth2`'s published ESM uses extensionless relative imports that Node's
    // native ESM loader can't resolve; inlining lets Vite transform and resolve them.
    server: {
      deps: { inline: ['payload-oauth2'] },
    },
    // One shared test database in Postgres push mode: run everything serially in a
    // single worker so concurrent schema pushes never race.
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    // Booting Payload + pushing schema is slower than a unit test.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
