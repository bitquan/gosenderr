import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:5180',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // ensure Playwright uses the same origin (127.0.0.1) so localStorage is accessible
    ignoreHTTPSErrors: true,
  },
  webServer: {
    // preview server should match the dev server port the CI uses
    command: 'pnpm --filter @gosenderr/marketplace-app exec -- vite preview --port 5180 --strictPort',
    port: 5180,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  globalSetup: require.resolve('./tests/e2e/setup/global-setup'),
});