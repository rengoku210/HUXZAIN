# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seller-subscription.spec.ts >> Seller Subscription UPI manual payment flow E2E >> 1. pricing & upgrade routing
- Location: e2e\seller-subscription.spec.ts:80:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Subscription"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("Seller Subscription UPI manual payment flow E2E", () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Enable browser console logging in E2E output
  6   |     page.on("console", (msg) => {
  7   |       console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  8   |     });
  9   |     page.on("pageerror", (err) => {
  10  |       console.error(`[Browser Page Error] ${err.message}`);
  11  |     });
  12  | 
  13  |     // Inject mock session into localStorage before any page initialization
  14  |     await page.addInitScript(() => {
  15  |       const mockSession = {
  16  |         access_token: "mock-token",
  17  |         token_type: "bearer",
  18  |         expires_in: 3600,
  19  |         refresh_token: "mock-refresh-token",
  20  |         user: {
  21  |           id: "seller-123",
  22  |           aud: "authenticated",
  23  |           role: "authenticated",
  24  |           email: "seller@huxzain.app",
  25  |           user_metadata: { role: "seller" },
  26  |           app_metadata: { provider: "email" }
  27  |         },
  28  |         expires_at: 9999999999
  29  |       };
  30  |       window.localStorage.setItem("huxzain.auth", JSON.stringify(mockSession));
  31  |     });
  32  | 
  33  |     // 1. Intercept Auth User (signed-in seller)
  34  |     await page.route("**/auth/v1/user", async (route) => {
  35  |       await route.fulfill({
  36  |         status: 200,
  37  |         contentType: "application/json",
  38  |         body: JSON.stringify({
  39  |           id: "seller-123",
  40  |           email: "seller@huxzain.app",
  41  |           user_metadata: { role: "seller" },
  42  |         }),
  43  |       });
  44  |     });
  45  | 
  46  |     // 2. Intercept Profiles SELECT (Standard Tier)
  47  |     await page.route("**/rest/v1/profiles*", async (route) => {
  48  |       await route.fulfill({
  49  |         status: 200,
  50  |         contentType: "application/json",
  51  |         body: JSON.stringify({
  52  |           id: "seller-123",
  53  |           username: "huxzainseller",
  54  |           display_name: "Premium HUXZAIN Seller",
  55  |           is_seller: true,
  56  |           subscription_tier: "standard"
  57  |         }),
  58  |       });
  59  |     });
  60  | 
  61  |     // 3. Intercept User Roles
  62  |     await page.route("**/rest/v1/user_roles*", async (route) => {
  63  |       await route.fulfill({
  64  |         status: 200,
  65  |         contentType: "application/json",
  66  |         body: JSON.stringify([{ role: "seller" }]),
  67  |       });
  68  |     });
  69  | 
  70  |     // 4. Intercept Payment Proofs List (empty by default)
  71  |     await page.route("**/rest/v1/subscription_payment_proofs*", async (route) => {
  72  |       await route.fulfill({
  73  |         status: 200,
  74  |         contentType: "application/json",
  75  |         body: JSON.stringify([]),
  76  |       });
  77  |     });
  78  |   });
  79  | 
  80  |   test("1. pricing & upgrade routing", async ({ page }) => {
  81  |     await page.goto("/seller/subscription");
  82  | 
  83  |     // Verify Title
> 84  |     await expect(page.locator("h1")).toContainText("Subscription");
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  85  | 
  86  |     // Verify Direct INR ₹ Pricing
  87  |     await expect(page.locator("text=Free/mo")).toBeVisible();
  88  |     await expect(page.locator("text=₹299/mo")).toBeVisible();
  89  |     await expect(page.locator("text=₹599/mo")).toBeVisible();
  90  |     await expect(page.locator("text=₹999/mo")).toBeVisible();
  91  | 
  92  |     // Intercept navigation or click Upgrade
  93  |     await page.click('button:has-text("Upgrade to Enterprise")');
  94  | 
  95  |     // Confirm redirection and URL search params
  96  |     await page.waitForURL(url => url.pathname.includes("/seller/subscription/payment") && url.search.includes("plan="));
  97  |     await expect(page.locator("h1")).toContainText("Manual QR Code Checkout");
  98  |   });
  99  | 
  100 |   test("2. QR checkout details & uploader preview", async ({ page }) => {
  101 |     await page.goto("/seller/subscription/payment?plan=enterprise");
  102 | 
  103 |     // Confirm Plan Meta Renders Correctly
  104 |     await expect(page.locator("text=Enterprise Subscription")).toBeVisible();
  105 |     await expect(page.locator("text=₹999")).toBeVisible();
  106 | 
  107 |     // Confirm instructions notice renders
  108 |     await expect(page.locator("text=Important Payment Instructions")).toBeVisible();
  109 | 
  110 |     // Click confirm payment to open uploader step
  111 |     await page.click('button:has-text("I\'ve Paid / Confirm Payment")');
  112 |     await expect(page.locator("text=Upload Payment Proof")).toBeVisible();
  113 | 
  114 |     // Select a file
  115 |     const fileBuffer = Buffer.from("mock-screenshot-content");
  116 |     await page.setInputFiles('input[type="file"]', {
  117 |       name: "upi_receipt.png",
  118 |       mimeType: "image/png",
  119 |       buffer: fileBuffer,
  120 |     });
  121 | 
  122 |     // Verify uploader loads file preview and submit button enables
  123 |     await expect(page.locator("text=Loaded:")).toBeVisible();
  124 |     await expect(page.locator('button:has-text("Submit Payment Proof")')).toBeEnabled();
  125 |   });
  126 | 
  127 |   test("3. complete flow & success GPay animation", async ({ page }) => {
  128 |     // Intercept storage upload
  129 |     await page.route("**/storage/v1/object/payment-proofs/**", async (route) => {
  130 |       await route.fulfill({
  131 |         status: 200,
  132 |         contentType: "application/json",
  133 |         body: JSON.stringify({ Key: "payment-proofs/seller-123/proof.png" }),
  134 |       });
  135 |     });
  136 | 
  137 |     // Intercept DB insert
  138 |     await page.route("**/rest/v1/subscription_payment_proofs*", async (route) => {
  139 |       if (route.request().method() === "POST") {
  140 |         await route.fulfill({
  141 |           status: 201,
  142 |           contentType: "application/json",
  143 |           body: JSON.stringify([{ id: "proof-abc-123", status: "pending" }]),
  144 |         });
  145 |       }
  146 |     });
  147 | 
  148 |     await page.goto("/seller/subscription/payment?plan=enterprise");
  149 |     await page.click('button:has-text("I\'ve Paid / Confirm Payment")');
  150 |     
  151 |     // Upload screenshot
  152 |     await page.setInputFiles('input[type="file"]', {
  153 |       name: "receipt.jpg",
  154 |       mimeType: "image/jpeg",
  155 |       buffer: Buffer.from("proof"),
  156 |     });
  157 | 
  158 |     // Submit
  159 |     await page.click('button:has-text("Submit Payment Proof")');
  160 | 
  161 |     // Confirm success page renders satisfying green confirmation and GPay checkmark
  162 |     await expect(page.locator("h1")).toContainText("Payment Submitted");
  163 |     await expect(page.locator("text=Voucher Code Verified & Logged")).toBeVisible();
  164 |     await expect(page.locator("text=Pending Review")).toBeVisible();
  165 |   });
  166 | });
  167 | 
```