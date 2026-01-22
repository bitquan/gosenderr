import { test } from "@playwright/test";

/**
 * Screenshot capture script for documentation
 *
 * This test suite captures screenshots of all major pages
 * for documentation purposes.
 */

test.describe("Documentation Screenshots", () => {
  test("capture all public pages", async ({ page }) => {
    const pages = [
      { url: "/", name: "home" },
      { url: "/login", name: "login" },
      { url: "/admin-login", name: "admin-login" },
      { url: "/marketplace", name: "marketplace" },
      { url: "/select-role", name: "select-role" },
    ];

    for (const pageInfo of pages) {
      console.log(`📸 Capturing: ${pageInfo.name}`);

      await page.goto(pageInfo.url);
      await page.waitForLoadState("networkidle");

      // Desktop screenshot
      await page.screenshot({
        path: `screenshots/docs/${pageInfo.name}-desktop.png`,
        fullPage: true,
      });

      // Mobile screenshot
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      await page.screenshot({
        path: `screenshots/docs/${pageInfo.name}-mobile.png`,
        fullPage: true,
      });

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    }
  });

  test("capture login with each role tab", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const roles = [
      { text: "Customer", value: "customer", emoji: "👤" },
      { text: "Driver", value: "driver", emoji: "🚗" },
      { text: "Runner", value: "runner", emoji: "🚚" },
      { text: "Vendor", value: "vendor", emoji: "🏪" },
    ];

    for (const role of roles) {
      console.log(`📸 Capturing login as: ${role.text}`);

      // Click the role tab (look for button with emoji + text)
      const roleButton = page
        .locator(`button:has-text("${role.emoji}")`)
        .first();
      await roleButton.click();
      await page.waitForTimeout(300);

      await page.screenshot({
        path: `screenshots/docs/login-${role.value}-tab.png`,
        fullPage: true,
      });
    }
  });
});
