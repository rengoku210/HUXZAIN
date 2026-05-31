# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: paymentVerification.spec.ts >> Payment Verification Flow >> should handle upload cancellation using AbortController
- Location: e2e\paymentVerification.spec.ts:90:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.setInputFiles: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('input[type="file"]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "HUXZAIN" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "HUXZAIN"
      - generic [ref=e6]:
        - button "Cart" [ref=e8]:
          - img [ref=e9]
        - link "Sign Up" [ref=e13] [cursor=pointer]:
          - /url: /signup
        - button [ref=e14]:
          - img [ref=e15]
    - generic [ref=e18]:
      - link "Home" [ref=e19] [cursor=pointer]:
        - /url: /
      - link "Digital Products" [ref=e20] [cursor=pointer]:
        - /url: /category/digital-products
      - link "Services" [ref=e21] [cursor=pointer]:
        - /url: /category/services
      - link "Hosting" [ref=e22] [cursor=pointer]:
        - /url: /category/hosting
      - link "SEO" [ref=e23] [cursor=pointer]:
        - /url: /category/seo
      - link "Design" [ref=e24] [cursor=pointer]:
        - /url: /category/design
      - link "Programming" [ref=e25] [cursor=pointer]:
        - /url: /category/programming
      - link "Marketing" [ref=e26] [cursor=pointer]:
        - /url: /category/marketing
      - link "Business" [ref=e27] [cursor=pointer]:
        - /url: /category/business
      - link "More" [ref=e28] [cursor=pointer]:
        - /url: /category/more
  - main [ref=e29]:
    - generic [ref=e30]:
      - heading "Sign in to HUXZAIN" [level=1] [ref=e31]
      - paragraph [ref=e32]: Welcome back. Continue to your dashboard.
      - generic [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]: Email
          - textbox "Email" [ref=e36]
        - generic [ref=e37]:
          - generic [ref=e38]: Password
          - textbox "Password" [ref=e39]
        - generic [ref=e40]:
          - button "Sign in" [ref=e41]
          - button "Sign in with Magic Link" [ref=e42]
      - generic [ref=e43]:
        - link "Forgot password?" [ref=e44] [cursor=pointer]:
          - /url: /forgot-password
        - link "Create account" [ref=e45] [cursor=pointer]:
          - /url: /signup
      - generic [ref=e46]: or
      - generic [ref=e49]:
        - button "Google" [ref=e50]
        - button "Apple" [ref=e51]
  - contentinfo [ref=e52]:
    - generic [ref=e54]:
      - generic [ref=e55]:
        - img [ref=e57]
        - generic [ref=e60]:
          - generic [ref=e61]: Stay Updated with HUXZAIN
          - paragraph [ref=e62]: Subscribe to get updates, offers and more.
      - generic [ref=e63]:
        - textbox "Enter your email address" [ref=e64]
        - button "Subscribe" [ref=e65]
    - generic [ref=e66]:
      - generic [ref=e67]:
        - img "HUXZAIN"
        - paragraph [ref=e68]: The most secure marketplace for digital products and services.
        - generic [ref=e69]:
          - link [ref=e70] [cursor=pointer]:
            - /url: "#"
            - img [ref=e71]
          - link [ref=e73] [cursor=pointer]:
            - /url: "#"
            - img [ref=e74]
          - link [ref=e76] [cursor=pointer]:
            - /url: "#"
            - img [ref=e77]
          - link [ref=e80] [cursor=pointer]:
            - /url: "#"
            - img [ref=e81]
          - link [ref=e84] [cursor=pointer]:
            - /url: "#"
            - img [ref=e85]
      - generic [ref=e87]:
        - heading "Marketplace" [level=4] [ref=e88]
        - list [ref=e89]:
          - listitem [ref=e90]:
            - link "Digital Products" [ref=e91] [cursor=pointer]:
              - /url: /category/digital-products
          - listitem [ref=e92]:
            - link "Services" [ref=e93] [cursor=pointer]:
              - /url: /category/services
          - listitem [ref=e94]:
            - link "All Categories" [ref=e95] [cursor=pointer]:
              - /url: /categories
          - listitem [ref=e96]:
            - link "How It Works" [ref=e97] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e98]:
            - link "Become a Seller" [ref=e99] [cursor=pointer]:
              - /url: /seller-panel
      - generic [ref=e100]:
        - heading "Support" [level=4] [ref=e101]
        - list [ref=e102]:
          - listitem [ref=e103]:
            - link "Contact Us" [ref=e104] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e105]:
            - link "How It Works" [ref=e106] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e107]:
            - link "Terms of Service" [ref=e108] [cursor=pointer]:
              - /url: /terms
          - listitem [ref=e109]:
            - link "Refund Policy" [ref=e110] [cursor=pointer]:
              - /url: /refund-policy
          - listitem [ref=e111]:
            - link "Privacy Policy" [ref=e112] [cursor=pointer]:
              - /url: /privacy
      - generic [ref=e113]:
        - heading "Company" [level=4] [ref=e114]
        - list [ref=e115]:
          - listitem [ref=e116]:
            - link "About Us" [ref=e117] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e118]:
            - link "Blog" [ref=e119] [cursor=pointer]:
              - /url: /blog
          - listitem [ref=e120]:
            - link "Careers" [ref=e121] [cursor=pointer]:
              - /url: /careers
          - listitem [ref=e122]:
            - link "Contact" [ref=e123] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e124]:
            - link "Privacy Policy" [ref=e125] [cursor=pointer]:
              - /url: /privacy
    - generic [ref=e127]:
      - paragraph [ref=e128]: © 2026 HUXZAIN. All rights reserved.
      - generic [ref=e129]:
        - img [ref=e130]
        - text: Secure Marketplace
      - generic [ref=e133]:
        - text: Made with
        - img [ref=e134]
        - text: for our community
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
  69  |     await expect(page.locator("h1")).toContainText("Upload Payment Proof");
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
> 94  |     await page.setInputFiles('input[type="file"]', {
      |     ^ Error: page.setInputFiles: Test timeout of 60000ms exceeded.
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