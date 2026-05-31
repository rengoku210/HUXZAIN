# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: paymentVerification.spec.ts >> Payment Verification Flow >> should display verify-payment page and handle file selection
- Location: e2e\paymentVerification.spec.ts:65:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Upload Payment Proof"
Received string:    "Sign in to HUXZAIN"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    6 × locator resolved to <h1 class="font-display text-2xl font-bold">Sign in to HUXZAIN</h1>
      - unexpected value "Sign in to HUXZAIN"

```

```yaml
- heading "Sign in to HUXZAIN" [level=1]
```

# Test source

```ts
  1   | // e2e/paymentVerification.spec.ts
  2   | import { test, expect } from "@playwright/test";
  3   | 
  4   | test.describe("Payment Verification Flow", () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     // Intercept Supabase auth user request to simulate signed-in user
  7   |     await page.route("**/auth/v1/user", async (route) => {
  8   |       await route.fulfill({
  9   |         status: 200,
  10  |         contentType: "application/json",
  11  |         body: JSON.stringify({
  12  |           id: "12345678-1234-1234-1234-1234567890ab",
  13  |           email: "buyer@example.com",
  14  |           user_metadata: { role: "buyer" },
  15  |         }),
  16  |       });
  17  |     });
  18  | 
  19  |     // Intercept screenshot_hashes check
  20  |     await page.route("**/rest/v1/screenshot_hashes*", async (route) => {
  21  |       await route.fulfill({
  22  |         status: 200,
  23  |         contentType: "application/json",
  24  |         body: JSON.stringify([]),
  25  |       });
  26  |     });
  27  | 
  28  |     // Intercept upload to supabase storage
  29  |     await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
  30  |       await route.fulfill({
  31  |         status: 200,
  32  |         contentType: "application/json",
  33  |         body: JSON.stringify({ Key: "payment-proofs/12345678-1234-1234-1234-1234567890ab/order-999/proof.png" }),
  34  |       });
  35  |     });
  36  | 
  37  |     // Intercept create signed url
  38  |     await page.route("**/storage/v1/object/sign/payment-proofs/**", async (route) => {
  39  |       await route.fulfill({
  40  |         status: 200,
  41  |         contentType: "application/json",
  42  |         body: JSON.stringify({ signedUrl: "https://example.com/signed-preview.png" }),
  43  |       });
  44  |     });
  45  | 
  46  |     // Intercept payment_verifications insert
  47  |     await page.route("**/rest/v1/payment_verifications*", async (route) => {
  48  |       await route.fulfill({
  49  |         status: 201,
  50  |         contentType: "application/json",
  51  |         body: JSON.stringify([
  52  |           {
  53  |             id: "ver-abc-123",
  54  |             user_id: "12345678-1234-1234-1234-1234567890ab",
  55  |             order_id: "order-999",
  56  |             status: "pending",
  57  |             ocr_result: { confidence: 0.85 },
  58  |             fraud_score: { score: 10 },
  59  |           },
  60  |         ]),
  61  |       });
  62  |     });
  63  |   });
  64  | 
  65  |   test("should display verify-payment page and handle file selection", async ({ page }) => {
  66  |     await page.goto("/checkout/verify-payment?orderId=order-999");
  67  | 
  68  |     // Verify Title
> 69  |     await expect(page.locator("h1")).toContainText("Upload Payment Proof");
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  70  | 
  71  |     // Create a mock buffer for file upload
  72  |     const fileBuffer = Buffer.from("mock-png-content");
  73  | 
  74  |     // Upload file
  75  |     await page.setInputFiles('input[type="file"]', {
  76  |       name: "receipt.png",
  77  |       mimeType: "image/png",
  78  |       buffer: fileBuffer,
  79  |     });
  80  | 
  81  |     // Verify preview is shown (should render the image preview)
  82  |     const preview = page.locator('img[alt="Preview"]');
  83  |     await expect(preview).toBeVisible();
  84  | 
  85  |     // Verify the Upload button is active
  86  |     const uploadBtn = page.locator('button:has-text("Upload & Verify")');
  87  |     await expect(uploadBtn).toBeEnabled();
  88  |   });
  89  | 
  90  |   test("should handle upload cancellation using AbortController", async ({ page }) => {
  91  |     await page.goto("/checkout/verify-payment?orderId=order-999");
  92  | 
  93  |     // Upload file
  94  |     await page.setInputFiles('input[type="file"]', {
  95  |       name: "receipt.png",
  96  |       mimeType: "image/png",
  97  |       buffer: Buffer.from("mock-content"),
  98  |     });
  99  | 
  100 |     // Intercept upload to stall and let us cancel
  101 |     await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
  102 |       // Stall the request
  103 |       await new Promise((resolve) => setTimeout(resolve, 2000));
  104 |       await route.fulfill({ status: 200 });
  105 |     });
  106 | 
  107 |     // Click Upload
  108 |     await page.click('button:has-text("Upload & Verify")');
  109 | 
  110 |     // Verify Cancel button appears and click it
  111 |     const cancelBtn = page.locator('button:has-text("Cancel")');
  112 |     await expect(cancelBtn).toBeVisible();
  113 |     await cancelBtn.click();
  114 | 
  115 |     // Verify Upload cancelled message is displayed
  116 |     await expect(
  117 |       page.locator("text=Upload cancelled.").or(page.locator("text=Upload aborted by user.")),
  118 |     ).toBeVisible();
  119 |   });
  120 | });
  121 | 
```