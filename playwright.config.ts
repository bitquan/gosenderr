import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  retries: 0,
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'landing',
      testMatch: /.*landing.*\.spec\.ts$/,
      use: { baseURL: 'http://localhost:3003' },
    },
    {
      name: 'customer',
      testMatch: /.*customer.*\.spec\.ts$/,
      use: { baseURL: 'http://localhost:5173' },
    },
    {
      name: 'courier',
      testMatch: /.*courier.*\.spec\.ts$/,
      use: { baseURL: 'http://localhost:5174' },
    },
    {
      name: 'vendor',
      testMatch: /.*vendor.*\.spec\.ts$/,
      use: { baseURL: 'http://localhost:5181' },
    },
    {
      name: 'runner',
      testMatch: /.*runner.*\.spec\.ts$/,
      use: { baseURL: 'http://localhost:5175' },
    },
    {
      name: 'admin',
      testMatch: /.*admin.*\.spec\.ts$/,
      use: { baseURL: 'http://localhost:3000' },
    },
    {
      name: 'integration',
      testMatch: /.*integration.*\.spec\.ts$/,
      use: { baseURL: 'http://localhost:5173' },
    },
  ],

  webServer: [
    { command: 'pnpm --filter @gosenderr/web dev', port: 3003, reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter @gosenderr/customer-app dev', port: 5173, reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter @gosenderr/courier-app dev', port: 5174, reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter @gosenderr/vendor-app dev -- --host 127.0.0.1 --port 5181', port: 5181, reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter @gosenderr/shifter-app dev', port: 5175, reuseExistingServer: !process.env.CI },
    { command: 'pnpm --filter @gosenderr/admin-app dev', port: 3000, reuseExistingServer: !process.env.CI },
  ],
});