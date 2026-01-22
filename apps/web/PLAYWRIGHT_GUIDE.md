# 📸 Playwright Screenshot & Testing Guide

## Quick Start

```bash
# Make sure dev server is running
pnpm dev

# In another terminal, run tests
cd apps/web
pnpm test
```

## Screenshot Commands

### Simple Screenshot Tool (Easiest!)

```bash
# Capture specific page
pnpm screenshot login           # Login page
pnpm screenshot marketplace     # Marketplace page
pnpm screenshot admin-login     # Admin login

# Capture all pages at once (desktop + mobile)
pnpm screenshot:all

# See all available pages
pnpm screenshot help
```

Screenshots are saved to `apps/web/screenshots/manual/`

### Available Pages

- `home` - Homepage
- `login` - Main login page
- `admin-login` - Admin portal login
- `marketplace` - Marketplace/Shop
- `select-role` - Role selection page
- `customer-dashboard` - Customer dashboard
- `courier-dashboard` - Courier dashboard
- `runner-dashboard` - Runner dashboard
- `vendor-items` - Vendor items page
- `admin-dashboard` - Admin dashboard

## Testing Commands

### Run Tests

```bash
# Run all tests
pnpm test

# Run in interactive UI mode (best for development)
pnpm test:ui

# Run in debug mode (step through tests)
pnpm test:debug

# Run specific test file
pnpm playwright test tests/example.spec.ts

# Run tests with specific browser
pnpm playwright test --project=chromium

# Run in headed mode (see browser window)
pnpm playwright test --headed
```

### Screenshot Tests

```bash
# Run automated screenshot test suite
pnpm test:screenshots

# This captures:
# - All public pages (desktop + mobile)
# - Each role tab on login page
# Saves to: screenshots/docs/
```

### View Results

```bash
# Open test report in browser
pnpm test:report
```

## Test Files

### `tests/example.spec.ts`

Basic functional tests:

- Homepage loads
- Login page displays correctly
- All role tabs visible
- Admin login navigation works
- Marketplace page loads

### `tests/screenshot-all.spec.ts`

Documentation screenshot capture:

- All public pages (desktop + mobile)
- Each login role tab
- Saves to `screenshots/docs/`

### `scripts/screenshot.js`

Simple CLI tool for quick screenshots:

- No test framework needed
- Fast single-page capture
- Both desktop and mobile versions
- Saves to `screenshots/manual/`

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";

test("my test name", async ({ page }) => {
  // 1. Navigate
  await page.goto("/login");

  // 2. Wait for page to load
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);

  // 3. Interact with elements
  await page.click('button:has-text("Login")');
  await page.fill('input[type="email"]', "test@example.com");

  // 4. Assert expectations
  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("h1")).toContainText("Welcome");

  // 5. Take screenshot
  await page.screenshot({ path: "screenshots/my-test.png" });
});
```

### Useful Selectors

```typescript
// By text
page.locator("text=Login");
page.getByText("Login");

// By role
page.getByRole("button", { name: "Login" });
page.getByRole("heading", { name: "Welcome" });

// By test ID (add data-testid="...")
page.getByTestId("login-button");

// CSS selectors
page.locator("button.primary");
page.locator("#login-form");

// Combining selectors
page.locator('button:has-text("Login")');
page.locator("div >> text=Welcome");
```

### Common Actions

```typescript
// Click
await page.click("button");
await page.locator("button").click();

// Fill input
await page.fill('input[type="email"]', "user@example.com");
await page.locator('input[name="password"]').fill("secret");

// Select dropdown
await page.selectOption("select", "option-value");

// Check/uncheck
await page.check('input[type="checkbox"]');
await page.uncheck('input[type="checkbox"]');

// Hover
await page.hover("button");

// Wait for element
await page.waitForSelector(".loading", { state: "hidden" });
await expect(page.locator(".content")).toBeVisible();
```

### Screenshots

```typescript
// Full page screenshot
await page.screenshot({
  path: "screenshots/page.png",
  fullPage: true,
});

// Element screenshot
await page.locator(".header").screenshot({
  path: "screenshots/header.png",
});

// Mobile viewport
await page.setViewportSize({ width: 375, height: 667 });
await page.screenshot({ path: "screenshots/mobile.png" });
```

## Configuration

Configuration is in [`playwright.config.ts`](playwright.config.ts):

- **Base URL**: `http://localhost:3000`
- **Browser**: Chromium (can add Firefox, Safari)
- **Parallel tests**: Yes
- **Retries on CI**: 2
- **Screenshots**: On failure
- **Videos**: On failure
- **Reports**: HTML in `playwright-report/`

### Adding More Browsers

Uncomment in `playwright.config.ts`:

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
],
```

Then install browsers:

```bash
pnpx playwright install firefox webkit
```

## CI/CD Integration

### GitHub Actions (Example)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpx playwright install --with-deps chromium

      - name: Run tests
        run: pnpm test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Tips

### 1. Use UI Mode (Best!)

```bash
pnpm test:ui
```

Interactive mode with:

- Time travel debugging
- Watch mode
- Locator picker
- Screenshots at each step

### 2. Use Debug Mode

```bash
pnpm test:debug
```

Opens Playwright Inspector:

- Step through tests line by line
- Inspect elements
- Try selectors in console

### 3. Add Debugging Code

```typescript
// Pause test
await page.pause();

// Console log
console.log(await page.content());
console.log(await page.title());

// Take screenshot
await page.screenshot({ path: "debug.png" });

// Print element text
const text = await page.locator("h1").textContent();
console.log(text);
```

### 4. Headed Mode

See the browser while tests run:

```bash
pnpm playwright test --headed --slowMo=1000
```

### 5. Video Recording

Videos are automatically recorded on failure. View them in the test report:

```bash
pnpm test:report
```

## Troubleshooting

### Tests timing out?

Increase timeout in test:

```typescript
test("slow test", async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### Page not loading?

Use better wait strategies:

```typescript
// Wait for DOM
await page.waitForLoadState("domcontentloaded");

// Wait for network to settle
await page.waitForLoadState("networkidle");

// Wait for specific element
await page.waitForSelector(".content", { state: "visible" });

// Manual timeout
await page.waitForTimeout(2000); // 2 seconds
```

### Element not found?

Check selector in UI mode:

```bash
pnpm test:ui
```

Use the "Pick Locator" tool to generate correct selector.

### Tests fail in CI but pass locally?

Common issues:

- Missing `await` on async operations
- Race conditions (add proper waits)
- Different viewport size
- Missing environment variables

## Best Practices

1. **Always wait for page to load**

   ```typescript
   await page.goto("/login");
   await page.waitForLoadState("domcontentloaded");
   ```

2. **Use specific selectors**

   ```typescript
   // Good
   page.getByRole("button", { name: "Submit" });
   page.getByTestId("submit-button");

   // Avoid
   page.locator("button").nth(2);
   ```

3. **Add meaningful test names**

   ```typescript
   test("user can login with valid credentials", async ({ page }) => {
     // ...
   });
   ```

4. **Clean up after tests**

   ```typescript
   test.afterEach(async ({ page }) => {
     // Logout, clear data, etc.
   });
   ```

5. **Use page objects for complex pages**
   ```typescript
   class LoginPage {
     constructor(page) {
       this.page = page;
     }
     async login(email, password) {
       await this.page.fill('[name="email"]', email);
       await this.page.fill('[name="password"]', password);
       await this.page.click('button[type="submit"]');
     }
   }
   ```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selector Guide](https://playwright.dev/docs/selectors)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Examples

See test files in `tests/` directory for working examples.
