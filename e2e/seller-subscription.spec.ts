import { test, expect } from "@playwright/test";

test.describe("Seller Subscription UPI manual payment flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Enable browser console logging in E2E output
    page.on("console", (msg) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      console.error(`[Browser Page Error] ${err.message}`);
    });

    // Inject mock session into localStorage before any page initialization
    await page.addInitScript(() => {
      const mockSession = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: {
          id: "seller-123",
          aud: "authenticated",
          role: "authenticated",
          email: "seller@huxzain.app",
          user_metadata: { role: "seller" },
          app_metadata: { provider: "email" }
        },
        expires_at: 9999999999
      };
      window.localStorage.setItem("huxzain.auth", JSON.stringify(mockSession));
    });

    // 1. Intercept Auth User (signed-in seller)
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "seller-123",
          email: "seller@huxzain.app",
          user_metadata: { role: "seller" },
        }),
      });
    });

    // 2. Intercept Profiles SELECT (Standard Tier)
    await page.route("**/rest/v1/profiles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "seller-123",
          username: "huxzainseller",
          display_name: "Premium HUXZAIN Seller",
          is_seller: true,
          subscription_tier: "standard"
        }),
      });
    });

    // 3. Intercept User Roles
    await page.route("**/rest/v1/user_roles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ role: "seller" }]),
      });
    });

    // 4. Intercept Payment Proofs List (empty by default)
    await page.route("**/rest/v1/subscription_payment_proofs*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  });

  test("1. pricing & upgrade routing", async ({ page }) => {
    await page.goto("/seller/subscription");

    // Verify Title
    await expect(page.locator("h1")).toContainText("Subscription");

    // Verify Direct INR ₹ Pricing
    await expect(page.locator("text=Free/mo")).toBeVisible();
    await expect(page.locator("text=₹299/mo")).toBeVisible();
    await expect(page.locator("text=₹599/mo")).toBeVisible();
    await expect(page.locator("text=₹999/mo")).toBeVisible();

    // Intercept navigation or click Upgrade
    await page.click('button:has-text("Upgrade to Enterprise")');

    // Confirm redirection and URL search params
    await page.waitForURL(url => url.pathname.includes("/seller/subscription/payment") && url.search.includes("plan="));
    await expect(page.locator("h1")).toContainText("Manual QR Code Checkout");
  });

  test("2. QR checkout details & uploader preview", async ({ page }) => {
    await page.goto("/seller/subscription/payment?plan=enterprise");

    // Confirm Plan Meta Renders Correctly
    await expect(page.locator("text=Enterprise Subscription")).toBeVisible();
    await expect(page.locator("text=₹999")).toBeVisible();

    // Confirm instructions notice renders
    await expect(page.locator("text=Important Payment Instructions")).toBeVisible();

    // Click confirm payment to open uploader step
    await page.click('button:has-text("I\'ve Paid / Confirm Payment")');
    await expect(page.locator("text=Upload Payment Proof")).toBeVisible();

    // Select a file
    const fileBuffer = Buffer.from("mock-screenshot-content");
    await page.setInputFiles('input[type="file"]', {
      name: "upi_receipt.png",
      mimeType: "image/png",
      buffer: fileBuffer,
    });

    // Verify uploader loads file preview and submit button enables
    await expect(page.locator("text=Loaded:")).toBeVisible();
    await expect(page.locator('button:has-text("Submit Payment Proof")')).toBeEnabled();
  });

  test("3. complete flow & success GPay animation", async ({ page }) => {
    // Intercept storage upload
    await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Key: "payment-proofs/seller-123/proof.png" }),
      });
    });

    // Intercept DB insert
    await page.route("**/rest/v1/subscription_payment_proofs*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([{ id: "proof-abc-123", status: "pending" }]),
        });
      }
    });

    await page.goto("/seller/subscription/payment?plan=enterprise");
    await page.click('button:has-text("I\'ve Paid / Confirm Payment")');
    
    // Upload screenshot
    await page.setInputFiles('input[type="file"]', {
      name: "receipt.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("proof"),
    });

    // Submit
    await page.click('button:has-text("Submit Payment Proof")');

    // Confirm success page renders satisfying green confirmation and GPay checkmark
    await expect(page.locator("h1")).toContainText("Payment Submitted");
    await expect(page.locator("text=Voucher Code Verified & Logged")).toBeVisible();
    await expect(page.locator("text=Pending Review")).toBeVisible();
  });
});
