import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const artifactDir = "C:/Users/rammo/.gemini/antigravity/brain/bbad445e-23f1-4a18-b756-4226c60d177e";
const consoleLogPath = path.join(artifactDir, "console_logs.txt");
const networkLogPath = path.join(artifactDir, "network_logs.txt");

// Reset log files
if (fs.existsSync(consoleLogPath)) fs.unlinkSync(consoleLogPath);
if (fs.existsSync(networkLogPath)) fs.unlinkSync(networkLogPath);

function logConsole(message: string) {
  fs.appendFileSync(consoleLogPath, `${new Date().toISOString()} - ${message}\n`);
}

function logNetwork(message: string) {
  fs.appendFileSync(networkLogPath, `${new Date().toISOString()} - ${message}\n`);
}

test.describe("HUXZAIN Automated QA Audit & Evidence Collector", () => {
  test.beforeEach(async ({ page }) => {
    // Console log listener
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      // Record all console logs (warnings and errors are of particular interest)
      logConsole(`[${type.toUpperCase()}] ${text}`);
    });

    // Unhandled exception listener
    page.on("pageerror", (err) => {
      logConsole(`[EXCEPTION] ${err.stack || err.message}`);
    });

    // Network request/response listener
    page.on("response", async (response) => {
      const status = response.status();
      const url = response.url();
      const method = response.request().method();
      
      // We only care about document/API/XHR requests to local or supabase endpoints
      if (url.includes("localhost") || url.includes("supabase.co")) {
        if (status >= 400) {
          logNetwork(`[FAILED REQUEST] ${method} ${url} -> Status ${status}`);
        } else {
          logNetwork(`[SUCCESS REQUEST] ${method} ${url} -> Status ${status}`);
        }
      }
    });
  });

  test("Run Platform-Wide Verification and Capture Screenshots", async ({ page }) => {
    test.setTimeout(180000);

    const desktopSize = { width: 1280, height: 800 };
    const mobileSize = { width: 375, height: 812 };

    const captureScreenshot = async (name: string, isMobile: boolean) => {
      const suffix = isMobile ? "mobile" : "desktop";
      const filePath = path.join(artifactDir, `evidence_${name}_${suffix}.png`);
      await page.waitForTimeout(2000); // Allow rendering to settle
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Captured screenshot: evidence_${name}_${suffix}.png`);
    };

    // Helper to switch viewports
    const setViewport = async (isMobile: boolean) => {
      if (isMobile) {
        await page.setViewportSize(mobileSize);
      } else {
        await page.setViewportSize(desktopSize);
      }
      await page.waitForTimeout(1000);
    };

    // -------------------------------------------------------------
    // Page 1 & 2: Homepage & Login Page
    // -------------------------------------------------------------
    
    // Visit Homepage (Desktop)
    await setViewport(false);
    await page.goto("http://localhost:8080/");
    await page.waitForLoadState("load");
    await expect(page.locator("text=India's Modern").first()).toBeVisible({ timeout: 15000 });
    await captureScreenshot("1_homepage", false);

    // Visit Homepage (Mobile)
    await setViewport(true);
    await page.goto("http://localhost:8080/");
    await page.waitForLoadState("load");
    await captureScreenshot("1_homepage", true);

    // Visit Login Page (Desktop)
    await setViewport(false);
    await page.goto("http://localhost:8080/login");
    await page.waitForLoadState("load");
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible();
    await captureScreenshot("2_login", false);

    // Visit Login Page (Mobile)
    await setViewport(true);
    await page.goto("http://localhost:8080/login");
    await page.waitForLoadState("load");
    await captureScreenshot("2_login", true);

    // -------------------------------------------------------------
    // Authenticate as Test Buyer
    // -------------------------------------------------------------
    console.log("Logging in as buyer test_buyer@huxzain.app...");
    await setViewport(false);
    await page.fill('input[type="email"]', "test_buyer@huxzain.app");
    await page.fill('input[type="password"]', "TempPass123!");
    await page.click('form button[type="submit"]');
    await page.waitForURL(url => url.pathname.includes("/dashboard") || url.pathname.includes("/orders"), { timeout: 15000 });
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------
    // Page 3 & 6: Buyer Dashboard & Disputes Tab
    // -------------------------------------------------------------
    // Go to Buyer Dashboard (Desktop)
    await page.goto("http://localhost:8080/dashboard");
    await page.waitForLoadState("load");
    await expect(page.locator("text=Buyer Console").first()).toBeVisible({ timeout: 15000 });
    await captureScreenshot("2_buyer_dashboard", false);

    // Go to Buyer Dashboard (Mobile)
    await setViewport(true);
    await page.waitForTimeout(1000);
    await captureScreenshot("2_buyer_dashboard", true);

    // Select Disputes Tab (Desktop)
    await setViewport(false);
    await page.click('button:has-text("Disputes")');
    await page.waitForTimeout(1000);
    await captureScreenshot("3_disputes", false);

    // Select Disputes Tab (Mobile)
    await setViewport(true);
    await page.waitForTimeout(1000);
    await captureScreenshot("3_disputes", true);

    // -------------------------------------------------------------
    // Page 4: Account Settings Page
    // -------------------------------------------------------------
    // Visit Account Settings (Desktop)
    await setViewport(false);
    await page.goto("http://localhost:8080/account");
    await page.waitForLoadState("load");
    await expect(page.locator("text=Account Settings").first()).toBeVisible({ timeout: 15000 });
    await captureScreenshot("4_account_settings", false);

    // Visit Account Settings (Mobile)
    await setViewport(true);
    await page.waitForTimeout(1000);
    await captureScreenshot("4_account_settings", true);

    // -------------------------------------------------------------
    // Page 5: Messages Page
    // -------------------------------------------------------------
    // Visit Messages (Desktop)
    await setViewport(false);
    await page.goto("http://localhost:8080/messages");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);
    await captureScreenshot("5_messages", false);

    // Visit Messages (Mobile)
    await setViewport(true);
    await page.waitForTimeout(1000);
    await captureScreenshot("5_messages", true);

    // -------------------------------------------------------------
    // Page 6: Checkout Flow (via Buy Now)
    // -------------------------------------------------------------
    // Go back to Homepage to click first product and Buy Now
    await setViewport(false);
    await page.goto("http://localhost:8080/");
    await page.waitForLoadState("load");
    const firstListing = page.locator('a[href^="/product/"]').first();
    await firstListing.click();
    await page.waitForURL("**/product/*", { timeout: 15000 });
    await page.waitForTimeout(1000);

    const buyNowBtn = page.locator('button:has-text("Buy Now")');
    await buyNowBtn.click();

    // Acknowledge Before Purchase modal if present
    const paymentProceedBtn = page.locator('button:has-text("Proceed To Payment")');
    try {
      await paymentProceedBtn.waitFor({ state: "visible", timeout: 4000 });
      console.log("Acknowledging BeforePurchaseNotice modal...");
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check();
      }
      await paymentProceedBtn.click();
    } catch (e) {
      console.log("BeforePurchaseNotice modal not visible or not present. Continuing...");
    }

    await page.waitForURL("**/checkout/payment?*", { timeout: 15000 });
    await page.waitForTimeout(1500);
    await captureScreenshot("6_checkout_flow", false);

    // Mobile Checkout
    await setViewport(true);
    await page.waitForTimeout(1000);
    await captureScreenshot("6_checkout_flow", true);

    // Log out Buyer
    await setViewport(false);
    await page.goto("http://localhost:8080/orders");
    await page.click('button[aria-label="User menu"]', { force: true });
    await page.click('button:has-text("Sign Out")', { force: true });
    await page.waitForURL("**/", { timeout: 15000 });
    console.log("Buyer logged out successfully.");

    // -------------------------------------------------------------
    // Authenticate as Admin/Seller
    // -------------------------------------------------------------
    console.log("Logging in as admin/seller lullilullivabhaiva@gmail.com...");
    await page.goto("http://localhost:8080/login");
    await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
    await page.fill('input[type="password"]', "TempPass123!");
    await page.click('form button[type="submit"]');
    await page.waitForURL(url => url.pathname.includes("/dashboard") || url.pathname.includes("/orders"), { timeout: 15000 });
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------
    // Page 7: Seller Dashboard
    // -------------------------------------------------------------
    // Visit Seller Dashboard (Desktop)
    await page.goto("http://localhost:8080/seller-panel");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    await captureScreenshot("7_seller_dashboard", false);

    // Visit Seller Dashboard (Mobile)
    await setViewport(true);
    await page.waitForTimeout(1000);
    await captureScreenshot("7_seller_dashboard", true);

    // -------------------------------------------------------------
    // Page 8: Admin Dashboard
    // -------------------------------------------------------------
    // Visit Admin Dashboard (Desktop)
    await setViewport(false);
    await page.goto("http://localhost:8080/admin");
    await page.waitForLoadState("load");
    await expect(page.locator("text=Admin Console").filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await captureScreenshot("8_admin_dashboard", false);

    // Visit Admin Dashboard (Mobile)
    await setViewport(true);
    await page.waitForTimeout(1000);
    await captureScreenshot("8_admin_dashboard", true);

    // Cleanup and log out
    await setViewport(false);
    await page.goto("http://localhost:8080/orders");
    await page.click('button[aria-label="User menu"]', { force: true });
    await page.click('button:has-text("Sign Out")', { force: true });
    await page.waitForURL("**/", { timeout: 15000 });
    console.log("Seller logged out. Automated Audit Complete!");
  });
});
