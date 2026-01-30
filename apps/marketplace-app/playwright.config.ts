import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:5180',
    trace: 'retain-on-failure',
    // Local runs: capture screenshots for every test so we can see the loaded screen.
    // CI runs: keep only-on-failure to save storage and bandwidth.
    screenshot: process.env.CI ? 'only-on-failure' : 'on',
    video: 'retain-on-failure',
    // ensure Playwright uses the same origin (127.0.0.1) so localStorage is accessible
    ignoreHTTPSErrors: true,
  },
  webServer: {
    // preview server should match the dev server port the CI uses
    command: 'pnpm --filter @gosenderr/marketplace-app exec -- vite preview --port 5180 --strictPort --host 127.0.0.1',
    port: 5180,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  globalSetup: './tests/e2e/setup/global-setup.ts',
});