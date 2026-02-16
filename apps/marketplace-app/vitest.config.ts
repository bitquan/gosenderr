import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/**/*.{test,spec}.ts',
      'src/**/*.{test,spec}.tsx',
      'tests/unit/**/*.{test,spec}.ts',
      'tests/unit/**/*.{test,spec}.tsx',
    ],
    exclude: [
      'tests/e2e/**',
      'tests/vendor-pages.spec.ts',
      'playwright*.config.ts',
    ],
  },
})
