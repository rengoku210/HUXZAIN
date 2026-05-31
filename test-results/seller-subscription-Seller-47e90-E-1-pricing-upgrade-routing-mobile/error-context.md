# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seller-subscription.spec.ts >> Seller Subscription UPI manual payment flow E2E >> 1. pricing & upgrade routing
- Location: e2e\seller-subscription.spec.ts:80:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
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
        - button "PS" [ref=e14]:
          - generic [ref=e16]: PS
          - img [ref=e17]
        - button [ref=e19]:
          - img [ref=e20]
    - link "Home" [ref=e24] [cursor=pointer]:
      - /url: /
  - main [ref=e25]:
    - generic [ref=e26]:
      - button "Back" [ref=e27] [cursor=pointer]:
        - img [ref=e28]
        - text: Back
      - generic [ref=e30]:
        - generic [ref=e31]:
          - heading "Verified Checkout" [level=1] [ref=e32]
          - paragraph [ref=e33]: Secure checkout powered by manual manual-escrow UPI payment proof
        - generic [ref=e34]:
          - generic [ref=e35]:
            - img [ref=e37]
            - generic [ref=e40]:
              - generic [ref=e41]: Summary
              - generic [ref=e42]: Enterprise Platform Tier Upgrade
              - generic [ref=e43]: "Seller: HUXZAIN Platform"
          - generic [ref=e44]:
            - generic [ref=e45]: Amount Payable
            - generic [ref=e46]: ₹999
        - generic [ref=e47]:
          - generic [ref=e49]:
            - generic [ref=e50]:
              - img [ref=e51]
              - text: UPI Secure Gateway
            - paragraph [ref=e54]: Scan QR code using Google Pay, PhonePe, UPI, or Paytm
          - img "UPI QR Code" [ref=e56]
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]: "UPI ID: rammodhvadiya210@okaxis"
              - button "Copy ID" [ref=e60] [cursor=pointer]:
                - img [ref=e61]
                - text: Copy ID
            - generic [ref=e64]:
              - generic [ref=e65]: "Amount: ₹999"
              - button "Copy Amount" [ref=e66] [cursor=pointer]:
                - img [ref=e67]
                - text: Copy Amount
        - generic [ref=e70]:
          - img [ref=e71]
          - generic [ref=e73]:
            - heading "Important Payment Instructions" [level=4] [ref=e74]
            - list [ref=e75]:
              - listitem [ref=e76]:
                - text: "Pay exact amount only:"
                - generic [ref=e77]: ₹999
              - listitem [ref=e78]: Do not pay less or more than shown amount
              - listitem [ref=e79]: Upload valid payment screenshot after payment
              - listitem [ref=e80]: Orders verified manually by HUXZAIN administrators
              - listitem [ref=e81]:
                - text: Verification may take
                - strong [ref=e82]: 24–48 hours
              - listitem [ref=e83]: Support is available immediately if any payment issue occurs
        - button "I Paid / Confirm Payment" [ref=e84] [cursor=pointer]:
          - text: I Paid / Confirm Payment
          - img [ref=e85]
  - contentinfo [ref=e87]:
    - generic [ref=e89]:
      - generic [ref=e90]:
        - img [ref=e92]
        - generic [ref=e95]:
          - generic [ref=e96]: Stay Updated with HUXZAIN
          - paragraph [ref=e97]: Subscribe to get updates, offers and more.
      - generic [ref=e98]:
        - textbox "Enter your email address" [ref=e99]
        - button "Subscribe" [ref=e100]
    - generic [ref=e101]:
      - generic [ref=e102]:
        - img "HUXZAIN"
        - paragraph [ref=e103]: The most secure marketplace for digital products and services.
        - generic [ref=e104]:
          - link [ref=e105] [cursor=pointer]:
            - /url: "#"
            - img [ref=e106]
          - link [ref=e108] [cursor=pointer]:
            - /url: "#"
            - img [ref=e109]
          - link [ref=e111] [cursor=pointer]:
            - /url: "#"
            - img [ref=e112]
          - link [ref=e115] [cursor=pointer]:
            - /url: "#"
            - img [ref=e116]
          - link [ref=e119] [cursor=pointer]:
            - /url: "#"
            - img [ref=e120]
      - generic [ref=e122]:
        - heading "Marketplace" [level=4] [ref=e123]
        - list [ref=e124]:
          - listitem [ref=e125]:
            - link "Digital Products" [ref=e126] [cursor=pointer]:
              - /url: /category/digital-products
          - listitem [ref=e127]:
            - link "Services" [ref=e128] [cursor=pointer]:
              - /url: /category/services
          - listitem [ref=e129]:
            - link "All Categories" [ref=e130] [cursor=pointer]:
              - /url: /categories
          - listitem [ref=e131]:
            - link "How It Works" [ref=e132] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e133]:
            - link "Become a Seller" [ref=e134] [cursor=pointer]:
              - /url: /seller-panel
      - generic [ref=e135]:
        - heading "Support" [level=4] [ref=e136]
        - list [ref=e137]:
          - listitem [ref=e138]:
            - link "Contact Us" [ref=e139] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e140]:
            - link "How It Works" [ref=e141] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e142]:
            - link "Terms of Service" [ref=e143] [cursor=pointer]:
              - /url: /terms
          - listitem [ref=e144]:
            - link "Refund Policy" [ref=e145] [cursor=pointer]:
              - /url: /refund-policy
          - listitem [ref=e146]:
            - link "Privacy Policy" [ref=e147] [cursor=pointer]:
              - /url: /privacy
      - generic [ref=e148]:
        - heading "Company" [level=4] [ref=e149]
        - list [ref=e150]:
          - listitem [ref=e151]:
            - link "About Us" [ref=e152] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e153]:
            - link "Blog" [ref=e154] [cursor=pointer]:
              - /url: /blog
          - listitem [ref=e155]:
            - link "Careers" [ref=e156] [cursor=pointer]:
              - /url: /careers
          - listitem [ref=e157]:
            - link "Contact" [ref=e158] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e159]:
            - link "Privacy Policy" [ref=e160] [cursor=pointer]:
              - /url: /privacy
    - generic [ref=e162]:
      - paragraph [ref=e163]: © 2026 HUXZAIN. All rights reserved.
      - generic [ref=e164]:
        - img [ref=e165]
        - text: Secure Marketplace
      - generic [ref=e168]:
        - text: Made with
        - img [ref=e169]
        - text: for our community
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
  21  |           id: "abcdefab-abcd-abcd-abcd-abcdefabcdef",
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
  39  |           id: "abcdefab-abcd-abcd-abcd-abcdefabcdef",
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
  52  |           id: "abcdefab-abcd-abcd-abcd-abcdefabcdef",
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
  84  |     await expect(page.locator("h1")).toContainText("Subscription");
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
> 96  |     await page.waitForURL(url => url.pathname.includes("/seller/subscription/payment") && url.search.includes("plan="));
      |                ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
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
  133 |         body: JSON.stringify({ Key: "payment-proofs/abcdefab-abcd-abcd-abcd-abcdefabcdef/proof.png" }),
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