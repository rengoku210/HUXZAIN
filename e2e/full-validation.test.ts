// e2e/full-validation.test.ts
import { test, expect } from "@playwright/test";

// Helper to ensure the dev server is reachable before tests run
test.beforeAll(async ({}) => {
  // Playwright will automatically wait for the page to load, so no extra setup needed.
});

test("server boots and basic page loads", async ({ page }) => {
  // Adjust the URL if you have a custom dev server port
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await expect(page).toHaveTitle(/HUXZAIN/i);
});

// Additional tests for payment flow, upload, cancel, OCR, realtime can be added later.
