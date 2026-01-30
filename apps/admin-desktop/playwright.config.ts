import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:5176',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  webServer: {
    // Use the Vite dev server that's already running
    command: 'pnpm vite --port 5176 --host 127.0.0.1',
    port: 5176,
    timeout: 120_000,
    reuseExistingServer: true, // Don't start new server if already running
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        viewport: { width: 1400, height: 900 }, // Match Electron window size
      },
    },
  ],
});
