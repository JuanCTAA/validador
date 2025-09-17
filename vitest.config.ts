import { defineConfig } from 'vitest/config'

const minutes = 10

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: minutes * 60 * 1000,
    hookTimeout: minutes * 60 * 1000,
    include: ['**/*.{test,spec,perf}.?(c|m)[jt]s?(x)'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    teardownTimeout: 30 * 1000,
    watch: false,
    reporters: process.env.CI ? 'verbose' : 'default',
  },
})
