import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  // Keep CI e2e stable and fast with deterministic smoke coverage.
  testMatch: ["**/customer-app.spec.ts", "**/vendor-auth.spec.ts"],
  testIgnore: [
    "**/*debug*.spec.ts",
    "**/*console*.spec.ts",
    "**/vendor-edit.spec.ts",
    "**/vendor-lifecycle.spec.ts",
  ],
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    // Test against the Firebase Hosting emulator started by scripts/start-emulators.sh.
    baseURL: "http://127.0.0.1:5000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // ensure Playwright uses the same origin (127.0.0.1) so localStorage is accessible
    ignoreHTTPSErrors: true,
  },
  globalSetup: "./tests/e2e/setup/global-setup",
});
