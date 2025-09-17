import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 300000, // 5 minutes timeout like the original Jest tests
    hookTimeout: 300000, // 5 minutes timeout for setup/teardown hooks
  },
})
