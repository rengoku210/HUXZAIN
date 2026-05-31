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
    - complementary [ref=e47]:
      - generic [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]: P
          - generic [ref=e51]:
            - generic [ref=e52]: Storefront
            - generic [ref=e53]: Premium HUXZAIN Seller
        - generic [ref=e54]:
          - generic [ref=e55]: Tier
          - generic [ref=e56]:
            - img [ref=e57]
            - generic [ref=e59]: Standard
      - navigation [ref=e60]:
        - generic [ref=e61]:
          - generic [ref=e62]: Overview
          - list [ref=e63]:
            - listitem [ref=e64]:
              - link "Dashboard" [ref=e65] [cursor=pointer]:
                - /url: /seller
                - img [ref=e66]
                - generic [ref=e71]: Dashboard
            - listitem [ref=e72]:
              - link "Analytics" [ref=e73] [cursor=pointer]:
                - /url: /seller/analytics
                - img [ref=e74]
                - generic [ref=e76]: Analytics
            - listitem [ref=e77]:
              - link "Notifications" [ref=e78] [cursor=pointer]:
                - /url: /seller/notifications
                - img [ref=e79]
                - generic [ref=e82]: Notifications
        - generic [ref=e83]:
          - generic [ref=e84]: Catalog & Sales
          - list [ref=e85]:
            - listitem [ref=e86]:
              - link "Listings" [ref=e87] [cursor=pointer]:
                - /url: /seller/listings
                - img [ref=e88]
                - generic [ref=e89]: Listings
            - listitem [ref=e90]:
              - link "Orders" [ref=e91] [cursor=pointer]:
                - /url: /seller/orders
                - img [ref=e92]
                - generic [ref=e95]: Orders
            - listitem [ref=e96]:
              - link "Delivery" [ref=e97] [cursor=pointer]:
                - /url: /seller/delivery
                - img [ref=e98]
                - generic [ref=e103]: Delivery
            - listitem [ref=e104]:
              - link "Disputes" [ref=e105] [cursor=pointer]:
                - /url: /seller/disputes
                - img [ref=e106]
                - generic [ref=e108]: Disputes
            - listitem [ref=e109]:
              - link "Reviews" [ref=e110] [cursor=pointer]:
                - /url: /seller/reviews
                - img [ref=e111]
                - generic [ref=e113]: Reviews
            - listitem [ref=e114]:
              - link "Messages / Chat" [ref=e115] [cursor=pointer]:
                - /url: /messages
                - img [ref=e116]
                - generic [ref=e118]: Messages / Chat
        - generic [ref=e119]:
          - generic [ref=e120]: Finance
          - list [ref=e121]:
            - listitem [ref=e122]:
              - link "Earnings" [ref=e123] [cursor=pointer]:
                - /url: /seller/earnings
                - img [ref=e124]
                - generic [ref=e126]: Earnings
            - listitem [ref=e127]:
              - link "Wallet" [ref=e128] [cursor=pointer]:
                - /url: /seller/wallet
                - img [ref=e129]
                - generic [ref=e132]: Wallet
            - listitem [ref=e133]:
              - link "Withdrawals" [ref=e134] [cursor=pointer]:
                - /url: /seller/withdrawals
                - img [ref=e135]
                - generic [ref=e138]: Withdrawals
            - listitem [ref=e139]:
              - link "Transactions" [ref=e140] [cursor=pointer]:
                - /url: /seller/transactions
                - img [ref=e141]
                - generic [ref=e144]: Transactions
        - generic [ref=e145]:
          - generic [ref=e146]: Growth
          - list [ref=e147]:
            - listitem [ref=e148]:
              - link "Coupons" [ref=e149] [cursor=pointer]:
                - /url: /seller/coupons
                - img [ref=e150]
                - generic [ref=e152]: Coupons
            - listitem [ref=e153]:
              - link "Boosts" [ref=e154] [cursor=pointer]:
                - /url: /seller/boosts
                - img [ref=e155]
                - generic [ref=e160]: Boosts
            - listitem [ref=e161]:
              - link "Advertise" [ref=e162] [cursor=pointer]:
                - /url: /seller/ads
                - img [ref=e163]
                - generic [ref=e166]: Advertise
        - generic [ref=e167]:
          - generic [ref=e168]: Account
          - list [ref=e169]:
            - listitem [ref=e170]:
              - link "Subscription" [ref=e171] [cursor=pointer]:
                - /url: /seller/subscription
                - img [ref=e172]
                - generic [ref=e174]: Subscription
                - img [ref=e175]
            - listitem [ref=e177]:
              - link "Verification" [ref=e178] [cursor=pointer]:
                - /url: /seller/verification
                - img [ref=e179]
                - generic [ref=e182]: Verification
            - listitem [ref=e183]:
              - link "Store" [ref=e184] [cursor=pointer]:
                - /url: /seller/store
                - img [ref=e185]
                - generic [ref=e191]: Store
            - listitem [ref=e192]:
              - link "Security" [ref=e193] [cursor=pointer]:
                - /url: /seller/security
                - img [ref=e194]
                - generic [ref=e197]: Security
            - listitem [ref=e198]:
              - link "Settings" [ref=e199] [cursor=pointer]:
                - /url: /seller/settings
                - img [ref=e200]
                - generic [ref=e203]: Settings
            - listitem [ref=e204]:
              - link "Support" [ref=e205] [cursor=pointer]:
                - /url: /seller/support
                - img [ref=e206]
                - generic [ref=e213]: Support
        - button "Logout" [ref=e214]:
          - img [ref=e215]
          - text: Logout
    - generic [ref=e219]:
      - button "Back" [ref=e220] [cursor=pointer]:
        - img [ref=e221]
        - text: Back
      - generic [ref=e223]:
        - generic [ref=e224]:
          - heading "Manual QR Code Checkout" [level=1] [ref=e225]
          - paragraph [ref=e226]: Securely upgrade to the Enterprise tier.
        - generic [ref=e227]:
          - generic [ref=e228]:
            - generic [ref=e229]: Selected Plan
            - generic [ref=e230]: Enterprise Subscription
          - generic [ref=e231]:
            - generic [ref=e232]: Amount Payable
            - generic [ref=e233]: ₹999
        - generic [ref=e234]:
          - generic [ref=e236]:
            - generic [ref=e237]:
              - img [ref=e238]
              - text: UPI Verified Gateway
            - paragraph [ref=e241]: Scan QR code using Google Pay, PhonePe, UPI, or Paytm
          - img "UPI QR Code" [ref=e243]
          - generic [ref=e245]: "UPI ID: rammodhvadiya210@okaxis"
        - generic [ref=e246]:
          - img [ref=e247]
          - generic [ref=e249]:
            - heading "Important Payment Instructions" [level=4] [ref=e250]
            - list [ref=e251]:
              - listitem [ref=e252]:
                - text: "Please pay the exact amount:"
                - generic [ref=e253]: ₹999
              - listitem [ref=e254]: Do not modify the amount or pay less/more than specified.
              - listitem [ref=e255]: Payments are manually verified after screenshot upload.
              - listitem [ref=e256]: Verification may take **24–48 hours** by our staff.
              - listitem [ref=e257]: Keep proof screenshot safe until verification completes.
        - button "I've Paid / Confirm Payment" [ref=e258]:
          - text: I've Paid / Confirm Payment
          - img [ref=e259]
  - contentinfo [ref=e261]:
    - generic [ref=e263]:
      - generic [ref=e264]:
        - img [ref=e266]
        - generic [ref=e269]:
          - generic [ref=e270]: Stay Updated with HUXZAIN
          - paragraph [ref=e271]: Subscribe to get updates, offers and more.
      - generic [ref=e272]:
        - textbox "Enter your email address" [ref=e273]
        - button "Subscribe" [ref=e274]
    - generic [ref=e275]:
      - generic [ref=e276]:
        - img "HUXZAIN"
        - paragraph [ref=e277]: The most secure marketplace for digital products and services.
        - generic [ref=e278]:
          - link [ref=e279] [cursor=pointer]:
            - /url: "#"
            - img [ref=e280]
          - link [ref=e282] [cursor=pointer]:
            - /url: "#"
            - img [ref=e283]
          - link [ref=e285] [cursor=pointer]:
            - /url: "#"
            - img [ref=e286]
          - link [ref=e289] [cursor=pointer]:
            - /url: "#"
            - img [ref=e290]
          - link [ref=e293] [cursor=pointer]:
            - /url: "#"
            - img [ref=e294]
      - generic [ref=e296]:
        - heading "Marketplace" [level=4] [ref=e297]
        - list [ref=e298]:
          - listitem [ref=e299]:
            - link "Digital Products" [ref=e300] [cursor=pointer]:
              - /url: /category/digital-products
          - listitem [ref=e301]:
            - link "Services" [ref=e302] [cursor=pointer]:
              - /url: /category/services
          - listitem [ref=e303]:
            - link "All Categories" [ref=e304] [cursor=pointer]:
              - /url: /categories
          - listitem [ref=e305]:
            - link "How It Works" [ref=e306] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e307]:
            - link "Become a Seller" [ref=e308] [cursor=pointer]:
              - /url: /seller-panel
      - generic [ref=e309]:
        - heading "Support" [level=4] [ref=e310]
        - list [ref=e311]:
          - listitem [ref=e312]:
            - link "Contact Us" [ref=e313] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e314]:
            - link "How It Works" [ref=e315] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e316]:
            - link "Terms of Service" [ref=e317] [cursor=pointer]:
              - /url: /terms
          - listitem [ref=e318]:
            - link "Refund Policy" [ref=e319] [cursor=pointer]:
              - /url: /refund-policy
          - listitem [ref=e320]:
            - link "Privacy Policy" [ref=e321] [cursor=pointer]:
              - /url: /privacy
      - generic [ref=e322]:
        - heading "Company" [level=4] [ref=e323]
        - list [ref=e324]:
          - listitem [ref=e325]:
            - link "About Us" [ref=e326] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e327]:
            - link "Blog" [ref=e328] [cursor=pointer]:
              - /url: /blog
          - listitem [ref=e329]:
            - link "Careers" [ref=e330] [cursor=pointer]:
              - /url: /careers
          - listitem [ref=e331]:
            - link "Contact" [ref=e332] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e333]:
            - link "Privacy Policy" [ref=e334] [cursor=pointer]:
              - /url: /privacy
    - generic [ref=e336]:
      - paragraph [ref=e337]: © 2026 HUXZAIN. All rights reserved.
      - generic [ref=e338]:
        - img [ref=e339]
        - text: Secure Marketplace
      - generic [ref=e342]:
        - text: Made with
        - img [ref=e343]
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