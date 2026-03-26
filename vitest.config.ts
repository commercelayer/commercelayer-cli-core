import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
    passWithNoTests: true,
    include: ['specs/**/*.spec.ts'],
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  }
})
