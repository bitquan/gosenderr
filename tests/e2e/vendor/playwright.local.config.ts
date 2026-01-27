import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  projects: [
    {
      name: 'vendor',
      use: { baseURL: 'http://127.0.0.1:5181' },
    },
  ],
});