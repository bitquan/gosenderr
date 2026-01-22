import { test, expect } from "@playwright/test";

/**
 * Example test suite for GoSenderr
 *
 * This demonstrates basic Playwright functionality:
 * - Navigation
 * - Element interaction
 * - Screenshots
 * - Assertions
 */

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    // Navigate to homepage
    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Take a screenshot
    await page.screenshot({ path: "screenshots/homepage.png", fullPage: true });

    // Verify the page title or content
    await expect(page).toHaveTitle(/GoSenderr/);
  });
});

test.describe("Login Page", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/login");

    // Wait for page to fully load with longer timeout
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000); // Give React time to hydrate

    // Take a screenshot
    await page.screenshot({
      path: "screenshots/login-page.png",
      fullPage: true,
    });

    // Check for role tabs (using more flexible selectors)
    const customerTab = page.locator("text=Customer").first();
    const driverTab = page.locator("text=Driver").first();
    const runnerTab = page.locator("text=Runner").first();
    const vendorTab = page.locator("text=Vendor").first();

    await expect(customerTab).toBeVisible({ timeout: 10000 });
    await expect(driverTab).toBeVisible();
    await expect(runnerTab).toBeVisible();
    await expect(vendorTab).toBeVisible();

    // Check for admin access link
    await expect(page.locator("text=Admin Access").first()).toBeVisible();
  });

  test("should show different role tabs", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Click each role tab and take screenshots
    const roles = [
      { name: "Customer", emoji: "👤" },
      { name: "Driver", emoji: "🚗" },
      { name: "Runner", emoji: "🚚" },
      { name: "Vendor", emoji: "🏪" },
    ];

    for (const role of roles) {
      // Find and click the role button using emoji
      const roleButton = page
        .locator(`button:has-text("${role.emoji}")`)
        .first();

      if (await roleButton.isVisible()) {
        await roleButton.click();

        // Wait a moment for UI update
        await page.waitForTimeout(500);

        // Take screenshot
        await page.screenshot({
          path: `screenshots/login-${role.name.toLowerCase()}.png`,
          fullPage: true,
        });
      }
    }
  });
});

test.describe("Admin Login", () => {
  test("should navigate to admin login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Click admin access link
    await page.click("text=Admin Access");

    // Wait for navigation
    await page.waitForURL("**/admin-login");

    // Take screenshot
    await page.screenshot({
      path: "screenshots/admin-login.png",
      fullPage: true,
    });

    // Verify admin login page
    await expect(page.getByText("Admin Portal")).toBeVisible();
    await expect(page.getByText("Admin Sign In")).toBeVisible();
  });
});

test.describe("Marketplace", () => {
  test("should display marketplace page", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
      path: "screenshots/marketplace.png",
      fullPage: true,
    });

    // Verify marketplace content (be more specific to avoid strict mode violation)
    await expect(
      page.locator('h1:has-text("Marketplace")').first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
