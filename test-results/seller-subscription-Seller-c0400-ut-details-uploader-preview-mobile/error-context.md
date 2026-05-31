# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seller-subscription.spec.ts >> Seller Subscription UPI manual payment flow E2E >> 2. QR checkout details & uploader preview
- Location: e2e\seller-subscription.spec.ts:100:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=₹999')
Expected: visible
Error: strict mode violation: locator('text=₹999') resolved to 2 elements:
    1) <div class="text-2xl font-display font-extrabold text-gold mt-0.5">₹999</div> aka locator('div').filter({ hasText: /^₹999$/ })
    2) <span class="text-gold font-bold">₹999</span> aka locator('span').filter({ hasText: '₹' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=₹999')

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
  - generic [ref=e25]:
    - button [ref=e26]:
      - img [ref=e27]
    - generic [ref=e28]:
      - img [ref=e30]
      - generic [ref=e32]: Subscription
  - main [ref=e35]:
    - generic [ref=e37]:
      - button "Back" [ref=e38] [cursor=pointer]:
        - img [ref=e39]
        - text: Back
      - generic [ref=e41]:
        - generic [ref=e42]:
          - heading "Manual QR Code Checkout" [level=1] [ref=e43]
          - paragraph [ref=e44]: Securely upgrade to the Enterprise tier.
        - generic [ref=e45]:
          - generic [ref=e46]:
            - generic [ref=e47]: Selected Plan
            - generic [ref=e48]: Enterprise Subscription
          - generic [ref=e49]:
            - generic [ref=e50]: Amount Payable
            - generic [ref=e51]: ₹999
        - generic [ref=e52]:
          - generic [ref=e54]:
            - generic [ref=e55]:
              - img [ref=e56]
              - text: UPI Verified Gateway
            - paragraph [ref=e59]: Scan QR code using Google Pay, PhonePe, UPI, or Paytm
          - img "UPI QR Code" [ref=e61]
          - generic [ref=e63]: "UPI ID: rammodhvadiya210@okaxis"
        - generic [ref=e64]:
          - img [ref=e65]
          - generic [ref=e67]:
            - heading "Important Payment Instructions" [level=4] [ref=e68]
            - list [ref=e69]:
              - listitem [ref=e70]:
                - text: "Please pay the exact amount:"
                - generic [ref=e71]: ₹999
              - listitem [ref=e72]: Do not modify the amount or pay less/more than specified.
              - listitem [ref=e73]: Payments are manually verified after screenshot upload.
              - listitem [ref=e74]: Verification may take **24–48 hours** by our staff.
              - listitem [ref=e75]: Keep proof screenshot safe until verification completes.
        - button "I've Paid / Confirm Payment" [ref=e76]:
          - text: I've Paid / Confirm Payment
          - img [ref=e77]
  - contentinfo [ref=e79]:
    - generic [ref=e81]:
      - generic [ref=e82]:
        - img [ref=e84]
        - generic [ref=e87]:
          - generic [ref=e88]: Stay Updated with HUXZAIN
          - paragraph [ref=e89]: Subscribe to get updates, offers and more.
      - generic [ref=e90]:
        - textbox "Enter your email address" [ref=e91]
        - button "Subscribe" [ref=e92]
    - generic [ref=e93]:
      - generic [ref=e94]:
        - img "HUXZAIN"
        - paragraph [ref=e95]: The most secure marketplace for digital products and services.
        - generic [ref=e96]:
          - link [ref=e97] [cursor=pointer]:
            - /url: "#"
            - img [ref=e98]
          - link [ref=e100] [cursor=pointer]:
            - /url: "#"
            - img [ref=e101]
          - link [ref=e103] [cursor=pointer]:
            - /url: "#"
            - img [ref=e104]
          - link [ref=e107] [cursor=pointer]:
            - /url: "#"
            - img [ref=e108]
          - link [ref=e111] [cursor=pointer]:
            - /url: "#"
            - img [ref=e112]
      - generic [ref=e114]:
        - heading "Marketplace" [level=4] [ref=e115]
        - list [ref=e116]:
          - listitem [ref=e117]:
            - link "Digital Products" [ref=e118] [cursor=pointer]:
              - /url: /category/digital-products
          - listitem [ref=e119]:
            - link "Services" [ref=e120] [cursor=pointer]:
              - /url: /category/services
          - listitem [ref=e121]:
            - link "All Categories" [ref=e122] [cursor=pointer]:
              - /url: /categories
          - listitem [ref=e123]:
            - link "How It Works" [ref=e124] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e125]:
            - link "Become a Seller" [ref=e126] [cursor=pointer]:
              - /url: /seller-panel
      - generic [ref=e127]:
        - heading "Support" [level=4] [ref=e128]
        - list [ref=e129]:
          - listitem [ref=e130]:
            - link "Contact Us" [ref=e131] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e132]:
            - link "How It Works" [ref=e133] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e134]:
            - link "Terms of Service" [ref=e135] [cursor=pointer]:
              - /url: /terms
          - listitem [ref=e136]:
            - link "Refund Policy" [ref=e137] [cursor=pointer]:
              - /url: /refund-policy
          - listitem [ref=e138]:
            - link "Privacy Policy" [ref=e139] [cursor=pointer]:
              - /url: /privacy
      - generic [ref=e140]:
        - heading "Company" [level=4] [ref=e141]
        - list [ref=e142]:
          - listitem [ref=e143]:
            - link "About Us" [ref=e144] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e145]:
            - link "Blog" [ref=e146] [cursor=pointer]:
              - /url: /blog
          - listitem [ref=e147]:
            - link "Careers" [ref=e148] [cursor=pointer]:
              - /url: /careers
          - listitem [ref=e149]:
            - link "Contact" [ref=e150] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e151]:
            - link "Privacy Policy" [ref=e152] [cursor=pointer]:
              - /url: /privacy
    - generic [ref=e154]:
      - paragraph [ref=e155]: © 2026 HUXZAIN. All rights reserved.
      - generic [ref=e156]:
        - img [ref=e157]
        - text: Secure Marketplace
      - generic [ref=e160]:
        - text: Made with
        - img [ref=e161]
        - text: for our community
```

# Test source

```ts
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
  96  |     await page.waitForURL(url => url.pathname.includes("/seller/subscription/payment") && url.search.includes("plan="));
  97  |     await expect(page.locator("h1")).toContainText("Manual QR Code Checkout");
  98  |   });
  99  | 
  100 |   test("2. QR checkout details & uploader preview", async ({ page }) => {
  101 |     await page.goto("/seller/subscription/payment?plan=enterprise");
  102 | 
  103 |     // Confirm Plan Meta Renders Correctly
  104 |     await expect(page.locator("text=Enterprise Subscription")).toBeVisible();
> 105 |     await expect(page.locator("text=₹999")).toBeVisible();
      |                                             ^ Error: expect(locator).toBeVisible() failed
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