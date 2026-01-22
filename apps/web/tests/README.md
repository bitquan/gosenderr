# Playwright Testing & Screenshots

Playwright is set up for automated testing and screenshot capture.

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests in UI mode (interactive)
pnpm test:ui

# Debug tests step-by-step
pnpm test:debug

# Capture screenshots of all pages
pnpm test:screenshots

# View test report
pnpm test:report
```

## Test Files

- **tests/example.spec.ts** - Example tests for login, homepage, marketplace
- **tests/screenshot-all.spec.ts** - Automated screenshot capture for documentation

## Screenshot Output

Screenshots are saved to:

- `screenshots/` - Test screenshots
- `screenshots/docs/` - Documentation screenshots (desktop + mobile)

## Configuration

Configuration is in `playwright.config.ts`:

- Base URL: http://localhost:3000
- Browser: Chromium (can add Firefox, Safari)
- Screenshots: Taken on failure automatically
- Videos: Recorded on failure
- Reports: Generated in `playwright-report/`

## Writing Tests

```typescript
import { test, expect } from "@playwright/test";

test("my test", async ({ page }) => {
  // Navigate
  await page.goto("/");

  // Interact
  await page.click("text=Login");

  // Assert
  await expect(page).toHaveURL("/login");

  // Screenshot
  await page.screenshot({ path: "screenshots/my-page.png" });
});
```

## Useful Commands

```bash
# Run specific test file
pnpm playwright test tests/example.spec.ts

# Run tests in headed mode (see browser)
pnpm playwright test --headed

# Run tests with specific project (browser)
pnpm playwright test --project=chromium

# Update snapshots
pnpm playwright test --update-snapshots

# Show test trace
pnpm playwright show-trace trace.zip
```

## CI/CD

Tests run automatically in CI when:

- Push to main branch
- Pull request created
- Manual workflow dispatch

Results are uploaded as artifacts.

## Documentation

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
