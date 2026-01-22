#!/usr/bin/env node

/**
 * Screenshot Utility for GoSenderr
 *
 * Simple script to capture screenshots of specific pages
 * Usage: node scripts/screenshot.js <page-name>
 *
 * Examples:
 *   node scripts/screenshot.js login
 *   node scripts/screenshot.js marketplace
 *   node scripts/screenshot.js all
 */

const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const baseURL = "http://localhost:3000";
const screenshotDir = path.join(__dirname, "../screenshots/manual");

// Test credentials for each role
// You can override these with environment variables:
// CUSTOMER_EMAIL, CUSTOMER_PASSWORD, etc.
const testCredentials = {
  customer: {
    email: process.env.CUSTOMER_EMAIL || "customer@test.com",
    password: process.env.CUSTOMER_PASSWORD || "password123",
  },
  courier: {
    email: process.env.COURIER_EMAIL || "courier@test.com",
    password: process.env.COURIER_PASSWORD || "password123",
  },
  runner: {
    email: process.env.RUNNER_EMAIL || "runner@test.com",
    password: process.env.RUNNER_PASSWORD || "password123",
  },
  vendor: {
    email: process.env.VENDOR_EMAIL || "vendor@test.com",
    password: process.env.VENDOR_PASSWORD || "password123",
  },
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@test.com",
    password: process.env.ADMIN_PASSWORD || "password123",
  },
};

// Ensure screenshot directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const pages = {
  home: { url: "/", name: "home", public: true },
  login: { url: "/login", name: "login", public: true },
  "admin-login": { url: "/admin-login", name: "admin-login", public: true },
  marketplace: { url: "/marketplace", name: "marketplace", public: true },
  "select-role": { url: "/select-role", name: "select-role", public: true },
  "customer-dashboard": {
    url: "/customer/dashboard",
    name: "customer-dashboard",
    requiresAuth: "customer",
  },
  "courier-dashboard": {
    url: "/courier/dashboard",
    name: "courier-dashboard",
    requiresAuth: "courier",
  },
  "runner-dashboard": {
    url: "/runner/dashboard",
    name: "runner-dashboard",
    requiresAuth: "runner",
  },
  "vendor-items": {
    url: "/vendor/items",
    name: "vendor-items",
    requiresAuth: "vendor",
  },
  "admin-dashboard": {
    url: "/admin/dashboard",
    name: "admin-dashboard",
    requiresAuth: "admin",
  },
};

/**
 * Login to the application with given credentials
 */
async function login(page, role) {
  const credentials = testCredentials[role];

  if (!credentials) {
    throw new Error(`No credentials found for role: ${role}`);
  }

  console.log(`   🔐 Logging in as ${role} (${credentials.email})...`);

  // Determine which login page to use
  const loginUrl = role === "admin" ? "/admin-login" : "/login";
  await page.goto(`${baseURL}${loginUrl}`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);

  // For regular users, select the role tab first
  if (role !== "admin") {
    const roleEmojis = {
      customer: "👤",
      courier: "🚗",
      runner: "🚚",
      vendor: "🏪",
    };

    const roleButton = page
      .locator(`button:has-text("${roleEmojis[role]}")`)
      .first();
    if (await roleButton.isVisible()) {
      await roleButton.click();
      await page.waitForTimeout(300);
    }
  }

  // Fill in credentials
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);

  // Click the submit button (different text for admin vs regular)
  const buttonText = role === "admin" ? "Sign In as Admin" : "Continue";
  await page.click(`button:has-text("${buttonText}")`);

  // Wait for navigation
  await page.waitForTimeout(3000);

  // Check if login was successful
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `Login failed - still on login page. Check credentials for ${role}`,
    );
  }

  console.log(`   ✅ Logged in successfully`);
}

async function captureScreenshot(pageName, browser = null) {
  const pageInfo = pages[pageName];

  if (!pageInfo) {
    console.error(`❌ Unknown page: ${pageName}`);
    console.log("\n📋 Available pages:");
    Object.keys(pages).forEach((p) => console.log(`   - ${p}`));
    process.exit(1);
  }

  console.log(`\n📸 Capturing screenshot: ${pageInfo.name}`);
  console.log(`   URL: ${baseURL}${pageInfo.url}`);

  const shouldCloseBrowser = !browser;
  if (!browser) {
    browser = await chromium.launch();
  }

  const page = await browser.newPage();

  try {
    // Login if required
    if (pageInfo.requiresAuth) {
      await login(page, pageInfo.requiresAuth);
    }

    const targetUrl = `${baseURL}${pageInfo.url}`;
    await page.goto(targetUrl);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000); // Give React time to render

    // Check if we got redirected (e.g., to login)
    const currentUrl = page.url();
    if (currentUrl.includes("/login") && !targetUrl.includes("/login")) {
      console.log(`   ⚠️  Redirected to login page`);
      console.log(`   ℹ️  Authentication failed or credentials invalid`);
      return;
    }

    // Desktop screenshot
    const desktopPath = path.join(
      screenshotDir,
      `${pageInfo.name}-desktop.png`,
    );
    await page.screenshot({
      path: desktopPath,
      fullPage: true,
    });
    console.log(`   ✅ Desktop: ${desktopPath}`);

    // Mobile screenshot
    await page.setViewportSize({ width: 375, height: 667 });
    const mobilePath = path.join(screenshotDir, `${pageInfo.name}-mobile.png`);
    await page.screenshot({
      path: mobilePath,
      fullPage: true,
    });
    console.log(`   ✅ Mobile: ${mobilePath}`);
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  } finally {
    await page.close();
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
}

async function captureAll() {
  console.log("\n🎬 Capturing all pages (public + authenticated)...\n");

  const browser = await chromium.launch();

  try {
    for (const pageName of Object.keys(pages)) {
      await captureScreenshot(pageName, browser);
    }
  } finally {
    await browser.close();
  }

  console.log("\n✅ All screenshots captured!\n");
}

// Main
const args = process.argv.slice(2);
const target = args[0] || "help";

if (target === "help" || target === "-h" || target === "--help") {
  console.log(`
📸 Screenshot Utility for GoSenderr

Usage: node scripts/screenshot.js <page-name>

Available pages:
${Object.keys(pages)
  .map((p) => `  - ${p}`)
  .join("\n")}

Special commands:
  all          Capture all pages
  help         Show this help message

Examples:
  node scripts/screenshot.js login
  node scripts/screenshot.js marketplace
  node scripts/screenshot.js all
  `);
  process.exit(0);
}

if (target === "all") {
  captureAll().then(() => process.exit(0));
} else {
  captureScreenshot(target).then(() => process.exit(0));
}
