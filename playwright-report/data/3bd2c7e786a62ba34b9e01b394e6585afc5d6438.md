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
        - button "All Categories" [ref=e7]:
          - text: All Categories
          - img [ref=e8]
        - textbox "Search for digital products, services..." [ref=e10]
        - button [ref=e11]:
          - img [ref=e12]
      - generic [ref=e15]:
        - button "Cart" [ref=e17]:
          - img [ref=e18]
        - button "Notifications" [ref=e23] [cursor=pointer]:
          - img [ref=e24]
        - button "PS Premium HUXZAIN Seller" [ref=e28]:
          - generic [ref=e30]: PS
          - generic [ref=e31]: Premium HUXZAIN Seller
          - img [ref=e32]
    - generic [ref=e35]:
      - link "Home" [ref=e37] [cursor=pointer]:
        - /url: /
      - generic [ref=e38]:
        - link "Deals" [ref=e39] [cursor=pointer]:
          - /url: /
          - img [ref=e40]
          - text: Deals
        - link "Support" [ref=e42] [cursor=pointer]:
          - /url: /
          - img [ref=e43]
          - text: Support
  - main [ref=e46]:
    - generic [ref=e47]:
      - button "Back" [ref=e48] [cursor=pointer]:
        - img [ref=e49]
        - text: Back
      - generic [ref=e51]:
        - generic [ref=e52]:
          - heading "Verified Checkout" [level=1] [ref=e53]
          - paragraph [ref=e54]: Secure checkout powered by manual manual-escrow UPI payment proof
        - generic [ref=e55]:
          - generic [ref=e56]:
            - img [ref=e58]
            - generic [ref=e61]:
              - generic [ref=e62]: Summary
              - generic [ref=e63]: Enterprise Platform Tier Upgrade
              - generic [ref=e64]: "Seller: HUXZAIN Platform"
          - generic [ref=e65]:
            - generic [ref=e66]: Amount Payable
            - generic [ref=e67]: ₹999
        - generic [ref=e68]:
          - generic [ref=e70]:
            - generic [ref=e71]:
              - img [ref=e72]
              - text: UPI Secure Gateway
            - paragraph [ref=e75]: Scan QR code using Google Pay, PhonePe, UPI, or Paytm
          - img "UPI QR Code" [ref=e77]
          - generic [ref=e78]:
            - generic [ref=e79]:
              - generic [ref=e80]: "UPI ID: rammodhvadiya210@okaxis"
              - button "Copy ID" [ref=e81] [cursor=pointer]:
                - img [ref=e82]
                - text: Copy ID
            - generic [ref=e85]:
              - generic [ref=e86]: "Amount: ₹999"
              - button "Copy Amount" [ref=e87] [cursor=pointer]:
                - img [ref=e88]
                - text: Copy Amount
        - generic [ref=e91]:
          - img [ref=e92]
          - generic [ref=e94]:
            - heading "Important Payment Instructions" [level=4] [ref=e95]
            - list [ref=e96]:
              - listitem [ref=e97]:
                - text: "Pay exact amount only:"
                - generic [ref=e98]: ₹999
              - listitem [ref=e99]: Do not pay less or more than shown amount
              - listitem [ref=e100]: Upload valid payment screenshot after payment
              - listitem [ref=e101]: Orders verified manually by HUXZAIN administrators
              - listitem [ref=e102]:
                - text: Verification may take
                - strong [ref=e103]: 24–48 hours
              - listitem [ref=e104]: Support is available immediately if any payment issue occurs
        - button "I Paid / Confirm Payment" [ref=e105] [cursor=pointer]:
          - text: I Paid / Confirm Payment
          - img [ref=e106]
  - contentinfo [ref=e108]:
    - generic [ref=e110]:
      - generic [ref=e111]:
        - img [ref=e113]
        - generic [ref=e116]:
          - generic [ref=e117]: Stay Updated with HUXZAIN
          - paragraph [ref=e118]: Subscribe to get updates, offers and more.
      - generic [ref=e119]:
        - textbox "Enter your email address" [ref=e120]
        - button "Subscribe" [ref=e121]
    - generic [ref=e122]:
      - generic [ref=e123]:
        - img "HUXZAIN"
        - paragraph [ref=e124]: The most secure marketplace for digital products and services.
        - generic [ref=e125]:
          - link [ref=e126] [cursor=pointer]:
            - /url: "#"
            - img [ref=e127]
          - link [ref=e129] [cursor=pointer]:
            - /url: "#"
            - img [ref=e130]
          - link [ref=e132] [cursor=pointer]:
            - /url: "#"
            - img [ref=e133]
          - link [ref=e136] [cursor=pointer]:
            - /url: "#"
            - img [ref=e137]
          - link [ref=e140] [cursor=pointer]:
            - /url: "#"
            - img [ref=e141]
      - generic [ref=e143]:
        - heading "Marketplace" [level=4] [ref=e144]
        - list [ref=e145]:
          - listitem [ref=e146]:
            - link "Digital Products" [ref=e147] [cursor=pointer]:
              - /url: /category/digital-products
          - listitem [ref=e148]:
            - link "Services" [ref=e149] [cursor=pointer]:
              - /url: /category/services
          - listitem [ref=e150]:
            - link "All Categories" [ref=e151] [cursor=pointer]:
              - /url: /categories
          - listitem [ref=e152]:
            - link "How It Works" [ref=e153] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e154]:
            - link "Become a Seller" [ref=e155] [cursor=pointer]:
              - /url: /seller-panel
      - generic [ref=e156]:
        - heading "Support" [level=4] [ref=e157]
        - list [ref=e158]:
          - listitem [ref=e159]:
            - link "Contact Us" [ref=e160] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e161]:
            - link "How It Works" [ref=e162] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e163]:
            - link "Terms of Service" [ref=e164] [cursor=pointer]:
              - /url: /terms
          - listitem [ref=e165]:
            - link "Refund Policy" [ref=e166] [cursor=pointer]:
              - /url: /refund-policy
          - listitem [ref=e167]:
            - link "Privacy Policy" [ref=e168] [cursor=pointer]:
              - /url: /privacy
      - generic [ref=e169]:
        - heading "Company" [level=4] [ref=e170]
        - list [ref=e171]:
          - listitem [ref=e172]:
            - link "About Us" [ref=e173] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e174]:
            - link "Blog" [ref=e175] [cursor=pointer]:
              - /url: /blog
          - listitem [ref=e176]:
            - link "Careers" [ref=e177] [cursor=pointer]:
              - /url: /careers
          - listitem [ref=e178]:
            - link "Contact" [ref=e179] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e180]:
            - link "Privacy Policy" [ref=e181] [cursor=pointer]:
              - /url: /privacy
    - generic [ref=e183]:
      - paragraph [ref=e184]: © 2026 HUXZAIN. All rights reserved.
      - generic [ref=e185]:
        - img [ref=e186]
        - text: Secure Marketplace
      - generic [ref=e189]:
        - text: Made with
        - img [ref=e190]
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