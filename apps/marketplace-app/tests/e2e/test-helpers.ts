import type { Page } from '@playwright/test';
import type { TestInfo } from '@playwright/test';

/**
 * Capture a step-level full-page screenshot and save it to the test output folder.
 * Usage: await captureStep(page, testInfo, 'after-login')
 */
export async function captureStep(page: Page, testInfo: TestInfo, name: string) {
  const safe = name.replace(/[^a-zA-Z0-9-_\.]/g, '-').slice(0, 200);
  await page.screenshot({ path: testInfo.outputPath(`${safe}.png`), fullPage: true });
}
