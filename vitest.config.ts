import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30 * 1000, // 30 seconds default for unit tests
    hookTimeout: 10 * 1000, // 10 seconds for setup/teardown
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    teardownTimeout: 5 * 1000,
    watch: false,
    reporters: process.env.CI ? 'verbose' : 'default',
    exclude: ['**/node_modules/**', '**/dist/**'],
    projects: [
      {
        extends: true,
        test: {
          include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
          exclude: ['**/*.perf.test.?(c|m)[jt]s?(x)'],
          name: 'unit',
        },
      },
      {
        extends: true,
        test: {
          include: ['**/*.perf.test.?(c|m)[jt]s?(x)'],
          exclude: ['**/node_modules/**'],
          name: { label: 'performance', color: 'yellow' },
        },
      },
    ],
  },
})
