// e2e/paymentVerification.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Payment Verification Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock session into localStorage before any page initialization
    await page.addInitScript(() => {
      const mockSession = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: {
          id: "12345678-1234-1234-1234-1234567890ab",
          aud: "authenticated",
          role: "authenticated",
          email: "buyer@example.com",
          user_metadata: { role: "buyer" },
          app_metadata: { provider: "email" }
        },
        expires_at: 9999999999
      };
      window.localStorage.setItem("huxzain.auth", JSON.stringify(mockSession));
    });

    // Intercept Supabase auth user request to simulate signed-in user
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "12345678-1234-1234-1234-1234567890ab",
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

    // Intercept profiles check
    await page.route("**/rest/v1/profiles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "12345678-1234-1234-1234-1234567890ab",
          email: "buyer@example.com",
          user_metadata: { role: "buyer" },
          is_seller: false,
        }]),
      });
    });

    // Intercept user roles check
    await page.route("**/rest/v1/user_roles*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ role: "buyer" }]),
      });
    });

    // Intercept orders check
    await page.route("**/rest/v1/orders*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "order-999",
          amount_inr: 999,
          currency: "INR",
          listing_id: "list-123",
          seller_id: "seller-123",
          listings: { title: "Test Item" },
        }),
      });
    });

    // Intercept upload to supabase storage
    await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Key: "payment-proofs/12345678-1234-1234-1234-1234567890ab/order-999/proof.png" }),
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
            user_id: "12345678-1234-1234-1234-1234567890ab",
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

    // Fill UTR input to enable button
    await page.fill('input[placeholder*="UTR"]', "UTR123456789");

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

    // Fill UTR input to enable button
    await page.fill('input[placeholder*="UTR"]', "UTR123456789");

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
