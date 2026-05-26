// e2e/paymentVerification.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Payment Verification Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Supabase auth user request to simulate signed-in user
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-123",
          email: "buyer@example.com",
          user_metadata: { role: "buyer" },
        }),
      });
    });

    // Intercept screenshot_hashes check
    await page.route("**/rest/v1/screenshot_hashes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Intercept upload to supabase storage
    await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Key: "payment-proofs/user-123/order-999/proof.png" }),
      });
    });

    // Intercept create signed url
    await page.route("**/storage/v1/object/sign/payment-proofs/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signedUrl: "https://example.com/signed-preview.png" }),
      });
    });

    // Intercept payment_verifications insert
    await page.route("**/rest/v1/payment_verifications*", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "ver-abc-123",
            user_id: "user-123",
            order_id: "order-999",
            status: "pending",
            ocr_result: { confidence: 0.85 },
            fraud_score: { score: 10 },
          },
        ]),
      });
    });
  });

  test("should display verify-payment page and handle file selection", async ({ page }) => {
    await page.goto("/checkout/verify-payment?orderId=order-999");

    // Verify Title
    await expect(page.locator("h1")).toContainText("Upload Payment Proof");

    // Create a mock buffer for file upload
    const fileBuffer = Buffer.from("mock-png-content");

    // Upload file
    await page.setInputFiles('input[type="file"]', {
      name: "receipt.png",
      mimeType: "image/png",
      buffer: fileBuffer,
    });

    // Verify preview is shown (should render the image preview)
    const preview = page.locator('img[alt="Preview"]');
    await expect(preview).toBeVisible();

    // Verify the Upload button is active
    const uploadBtn = page.locator('button:has-text("Upload & Verify")');
    await expect(uploadBtn).toBeEnabled();
  });

  test("should handle upload cancellation using AbortController", async ({ page }) => {
    await page.goto("/checkout/verify-payment?orderId=order-999");

    // Upload file
    await page.setInputFiles('input[type="file"]', {
      name: "receipt.png",
      mimeType: "image/png",
      buffer: Buffer.from("mock-content"),
    });

    // Intercept upload to stall and let us cancel
    await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
      // Stall the request
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({ status: 200 });
    });

    // Click Upload
    await page.click('button:has-text("Upload & Verify")');

    // Verify Cancel button appears and click it
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Verify Upload cancelled message is displayed
    await expect(
      page.locator("text=Upload cancelled.").or(page.locator("text=Upload aborted by user.")),
    ).toBeVisible();
  });
});
