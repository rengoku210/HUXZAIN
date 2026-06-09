# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: paymentVerification.spec.ts >> Payment Verification Flow >> should display verify-payment page and handle file selection
- Location: e2e\paymentVerification.spec.ts:85:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Upload Payment Proof"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')

```

# Test source

```ts
  1   | // e2e/paymentVerification.spec.ts
  2   | import { test, expect } from "@playwright/test";
  3   | 
  4   | test.describe("Payment Verification Flow", () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     // Inject mock session into localStorage before any page initialization
  7   |     await page.addInitScript(() => {
  8   |       const mockSession = {
  9   |         access_token: "mock-token",
  10  |         token_type: "bearer",
  11  |         expires_in: 3600,
  12  |         refresh_token: "mock-refresh-token",
  13  |         user: {
  14  |           id: "12345678-1234-1234-1234-1234567890ab",
  15  |           aud: "authenticated",
  16  |           role: "authenticated",
  17  |           email: "buyer@example.com",
  18  |           user_metadata: { role: "buyer" },
  19  |           app_metadata: { provider: "email" }
  20  |         },
  21  |         expires_at: 9999999999
  22  |       };
  23  |       window.localStorage.setItem("huxzain.auth", JSON.stringify(mockSession));
  24  |     });
  25  | 
  26  |     // Intercept Supabase auth user request to simulate signed-in user
  27  |     await page.route("**/auth/v1/user", async (route) => {
  28  |       await route.fulfill({
  29  |         status: 200,
  30  |         contentType: "application/json",
  31  |         body: JSON.stringify({
  32  |           id: "12345678-1234-1234-1234-1234567890ab",
  33  |           email: "buyer@example.com",
  34  |           user_metadata: { role: "buyer" },
  35  |         }),
  36  |       });
  37  |     });
  38  | 
  39  |     // Intercept screenshot_hashes check
  40  |     await page.route("**/rest/v1/screenshot_hashes*", async (route) => {
  41  |       await route.fulfill({
  42  |         status: 200,
  43  |         contentType: "application/json",
  44  |         body: JSON.stringify([]),
  45  |       });
  46  |     });
  47  | 
  48  |     // Intercept upload to supabase storage
  49  |     await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
  50  |       await route.fulfill({
  51  |         status: 200,
  52  |         contentType: "application/json",
  53  |         body: JSON.stringify({ Key: "payment-proofs/12345678-1234-1234-1234-1234567890ab/order-999/proof.png" }),
  54  |       });
  55  |     });
  56  | 
  57  |     // Intercept create signed url
  58  |     await page.route("**/storage/v1/object/sign/payment-proofs/**", async (route) => {
  59  |       await route.fulfill({
  60  |         status: 200,
  61  |         contentType: "application/json",
  62  |         body: JSON.stringify({ signedUrl: "https://example.com/signed-preview.png" }),
  63  |       });
  64  |     });
  65  | 
  66  |     // Intercept payment_verifications insert
  67  |     await page.route("**/rest/v1/payment_verifications*", async (route) => {
  68  |       await route.fulfill({
  69  |         status: 201,
  70  |         contentType: "application/json",
  71  |         body: JSON.stringify([
  72  |           {
  73  |             id: "ver-abc-123",
  74  |             user_id: "12345678-1234-1234-1234-1234567890ab",
  75  |             order_id: "order-999",
  76  |             status: "pending",
  77  |             ocr_result: { confidence: 0.85 },
  78  |             fraud_score: { score: 10 },
  79  |           },
  80  |         ]),
  81  |       });
  82  |     });
  83  |   });
  84  | 
  85  |   test("should display verify-payment page and handle file selection", async ({ page }) => {
  86  |     await page.goto("/checkout/verify-payment?orderId=order-999");
  87  | 
  88  |     // Verify Title
> 89  |     await expect(page.locator("h1")).toContainText("Upload Payment Proof");
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  90  | 
  91  |     // Create a mock buffer for file upload
  92  |     const fileBuffer = Buffer.from("mock-png-content");
  93  | 
  94  |     // Upload file
  95  |     await page.setInputFiles('input[type="file"]', {
  96  |       name: "receipt.png",
  97  |       mimeType: "image/png",
  98  |       buffer: fileBuffer,
  99  |     });
  100 | 
  101 |     // Verify preview is shown (should render the image preview)
  102 |     const preview = page.locator('img[alt="Preview"]');
  103 |     await expect(preview).toBeVisible();
  104 | 
  105 |     // Verify the Upload button is active
  106 |     const uploadBtn = page.locator('button:has-text("Upload & Verify")');
  107 |     await expect(uploadBtn).toBeEnabled();
  108 |   });
  109 | 
  110 |   test("should handle upload cancellation using AbortController", async ({ page }) => {
  111 |     await page.goto("/checkout/verify-payment?orderId=order-999");
  112 | 
  113 |     // Upload file
  114 |     await page.setInputFiles('input[type="file"]', {
  115 |       name: "receipt.png",
  116 |       mimeType: "image/png",
  117 |       buffer: Buffer.from("mock-content"),
  118 |     });
  119 | 
  120 |     // Intercept upload to stall and let us cancel
  121 |     await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
  122 |       // Stall the request
  123 |       await new Promise((resolve) => setTimeout(resolve, 2000));
  124 |       await route.fulfill({ status: 200 });
  125 |     });
  126 | 
  127 |     // Click Upload
  128 |     await page.click('button:has-text("Upload & Verify")');
  129 | 
  130 |     // Verify Cancel button appears and click it
  131 |     const cancelBtn = page.locator('button:has-text("Cancel")');
  132 |     await expect(cancelBtn).toBeVisible();
  133 |     await cancelBtn.click();
  134 | 
  135 |     // Verify Upload cancelled message is displayed
  136 |     await expect(
  137 |       page.locator("text=Upload cancelled.").or(page.locator("text=Upload aborted by user.")),
  138 |     ).toBeVisible();
  139 |   });
  140 | });
  141 | 
```