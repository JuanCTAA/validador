import { defineConfig } from 'vitest/config'

const minutes = 10

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30 * 1000, // 30 seconds default for unit tests
    hookTimeout: 10 * 1000, // 10 seconds for setup/teardown
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'], // Unit tests by default
    exclude: ['**/*.perf.?(c|m)[jt]s?(x)', '**/node_modules/**'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false, // Allow parallel execution for unit tests
      },
    },
    teardownTimeout: 5 * 1000, // 5 seconds for cleanup
    watch: false,
    reporters: process.env.CI ? 'verbose' : 'default',
  },
  // Override configuration for performance tests when running them specifically
  ...(process.env.VITEST_PROJECT === 'performance' && {
    test: {
      environment: 'node',
      testTimeout: minutes * 60 * 1000, // 10 minutes for performance tests
      hookTimeout: minutes * 60 * 1000, // 10 minutes for setup/teardown
      include: ['**/*.perf.?(c|m)[jt]s?(x)'],
      exclude: ['**/node_modules/**'],
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: true, // Sequential execution to avoid resource conflicts
        },
      },
      teardownTimeout: 30 * 1000, // 30 seconds for cleanup
      watch: false,
      reporters: process.env.CI ? 'verbose' : 'default',
    },
  }),
})
