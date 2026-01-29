import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview --filter @gosenderr/customer-app --port 5173',
    port: 5173,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  globalSetup: require.resolve('./tests/e2e/setup/global-setup'),
});