import { test } from '@playwright/test';

// Global afterEach: take a timestamped full-page screenshot after every test locally.
// Uses testInfo.outputPath so screenshots are placed under the Playwright test-results folder.
if (!process.env.CI) {
  test.afterEach(async ({ page }, testInfo) => {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `afterEach-${ts}.png`;
      await page.screenshot({ path: testInfo.outputPath(filename), fullPage: true });
    } catch (err) {
      // Don't fail the test if screenshot capture fails
      // eslint-disable-next-line no-console
      console.error('afterEach screenshot failed', err);
    }
  });
}
