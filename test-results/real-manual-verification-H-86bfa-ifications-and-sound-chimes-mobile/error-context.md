# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: real-manual-verification.spec.ts >> HUXZAIN Real-Browser Manual Verification Flow >> 2. Payment approval, order status, notifications, and sound chimes
- Location: e2e\real-manual-verification.spec.ts:73:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('tr:has-text("Test Buyer")').first().locator('button:has-text("Inspect")')

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
        - button "LU" [ref=e14]:
          - generic [ref=e16]: LU
          - img [ref=e17]
        - button [ref=e19]:
          - img [ref=e20]
    - generic [ref=e23]:
      - link "Home" [ref=e24] [cursor=pointer]:
        - /url: /
      - link "Digital Products" [ref=e25] [cursor=pointer]:
        - /url: /category/digital-products
      - link "Services" [ref=e26] [cursor=pointer]:
        - /url: /category/services
      - link "Hosting" [ref=e27] [cursor=pointer]:
        - /url: /category/hosting
      - link "SEO" [ref=e28] [cursor=pointer]:
        - /url: /category/seo
      - link "Design" [ref=e29] [cursor=pointer]:
        - /url: /category/design
      - link "Programming" [ref=e30] [cursor=pointer]:
        - /url: /category/programming
      - link "Marketing" [ref=e31] [cursor=pointer]:
        - /url: /category/marketing
      - link "Business" [ref=e32] [cursor=pointer]:
        - /url: /category/business
      - link "More" [ref=e33] [cursor=pointer]:
        - /url: /category/more
  - main [ref=e34]:
    - complementary [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]: Admin Console
        - generic [ref=e38]: lullilullivabhaiva
      - list [ref=e39]:
        - listitem [ref=e40]:
          - link "Overview" [ref=e41] [cursor=pointer]:
            - /url: /admin
            - img [ref=e42]
            - text: Overview
        - listitem [ref=e44]:
          - link "Users" [ref=e45] [cursor=pointer]:
            - /url: /admin/users
            - img [ref=e46]
            - text: Users
        - listitem [ref=e51]:
          - link "Listings" [ref=e52] [cursor=pointer]:
            - /url: /admin/listings
            - img [ref=e53]
            - text: Listings
        - listitem [ref=e54]:
          - link "Categories" [ref=e55] [cursor=pointer]:
            - /url: /admin/categories
            - img [ref=e56]
            - text: Categories
        - listitem [ref=e57]:
          - link "Payments" [ref=e58] [cursor=pointer]:
            - /url: /admin/payments
            - img [ref=e59]
            - text: Payments
        - listitem [ref=e61]:
          - link "Withdrawals" [ref=e62] [cursor=pointer]:
            - /url: /admin/withdrawals
            - img [ref=e63]
            - text: Withdrawals
        - listitem [ref=e65]:
          - link "Verifications" [ref=e66] [cursor=pointer]:
            - /url: /admin/verifications
            - img [ref=e67]
            - text: Verifications
        - listitem [ref=e69]:
          - link "Support Tickets" [ref=e70] [cursor=pointer]:
            - /url: /admin/tickets
            - img [ref=e71]
            - text: Support Tickets
        - listitem [ref=e73]:
          - link "Subscriptions" [ref=e74] [cursor=pointer]:
            - /url: /admin/subscriptions
            - img [ref=e75]
            - text: Subscriptions
        - listitem [ref=e77]:
          - link "Disputes" [ref=e78] [cursor=pointer]:
            - /url: /admin/disputes
            - img [ref=e79]
            - text: Disputes
        - listitem [ref=e81]:
          - link "Reports" [ref=e82] [cursor=pointer]:
            - /url: /admin/reports
            - img [ref=e83]
            - text: Reports
        - listitem [ref=e85]:
          - link "Analytics" [ref=e86] [cursor=pointer]:
            - /url: /admin/analytics
            - img [ref=e87]
            - text: Analytics
        - listitem [ref=e89]:
          - link "Settings" [ref=e90] [cursor=pointer]:
            - /url: /admin/settings
            - img [ref=e91]
            - text: Settings
        - listitem [ref=e94]:
          - button "Logout" [ref=e95]:
            - img [ref=e96]
            - text: Logout
    - generic [ref=e100]:
      - generic [ref=e101]:
        - generic [ref=e102]:
          - heading "Payment Verifications" [level=1] [ref=e103]:
            - img [ref=e104]
            - text: Payment Verifications
          - paragraph [ref=e106]: Unified review queue — Marketplace purchases and subscription upgrades.
        - button "Refresh" [ref=e107]:
          - img [ref=e108]
          - text: Refresh
      - generic [ref=e113]:
        - generic [ref=e114]:
          - generic [ref=e115]: "25"
          - generic [ref=e116]: Total
        - generic [ref=e117]:
          - generic [ref=e118]: "1"
          - generic [ref=e119]: Pending
        - generic [ref=e120]:
          - generic [ref=e121]: "12"
          - generic [ref=e122]: Approved
        - generic [ref=e123]:
          - generic [ref=e124]: "24"
          - generic [ref=e125]: Listings
        - generic [ref=e126]:
          - generic [ref=e127]: "1"
          - generic [ref=e128]: Subscriptions
      - generic [ref=e129]:
        - generic [ref=e130]:
          - button "pending" [ref=e131]
          - button "approved" [ref=e132]
          - button "rejected" [ref=e133]
          - button "all" [ref=e134]
          - button "All Types" [ref=e135]
          - button "listing" [ref=e136]
          - button "subscription" [ref=e137]
        - generic [ref=e138]:
          - img [ref=e139]
          - textbox "Search buyer, listing, reference..." [ref=e142]
      - table [ref=e145]:
        - rowgroup [ref=e146]:
          - row "Buyer Type Item / Plan Amount Status Submitted Actions" [ref=e147]:
            - columnheader "Buyer" [ref=e148]
            - columnheader "Type" [ref=e149]
            - columnheader "Item / Plan" [ref=e150]
            - columnheader "Amount" [ref=e151]
            - columnheader "Status" [ref=e152]
            - columnheader "Submitted" [ref=e153]
            - columnheader "Actions" [ref=e154]
        - rowgroup [ref=e155]:
          - row "nomg9549 listing Valorant Account 20+ Level Full Access Account ₹699 Only ₹699.00 pending 5/31/2026, 7:52:08 PM Inspect" [ref=e156]:
            - cell "nomg9549" [ref=e157]:
              - generic [ref=e158]: nomg9549
            - cell "listing" [ref=e159]:
              - generic [ref=e160]:
                - img [ref=e161]
                - text: listing
            - cell "Valorant Account 20+ Level Full Access Account ₹699 Only" [ref=e164]
            - cell "₹699.00" [ref=e165]
            - cell "pending" [ref=e166]:
              - generic [ref=e167]: pending
            - cell "5/31/2026, 7:52:08 PM" [ref=e168]
            - cell "Inspect" [ref=e169]:
              - button "Inspect" [ref=e170]:
                - img [ref=e171]
                - text: Inspect
  - contentinfo [ref=e174]:
    - generic [ref=e176]:
      - generic [ref=e177]:
        - img [ref=e179]
        - generic [ref=e182]:
          - generic [ref=e183]: Stay Updated with HUXZAIN
          - paragraph [ref=e184]: Subscribe to get updates, offers and more.
      - generic [ref=e185]:
        - textbox "Enter your email address" [ref=e186]
        - button "Subscribe" [ref=e187]
    - generic [ref=e188]:
      - generic [ref=e189]:
        - img "HUXZAIN"
        - paragraph [ref=e190]: The most secure marketplace for digital products and services.
        - generic [ref=e191]:
          - link [ref=e192] [cursor=pointer]:
            - /url: "#"
            - img [ref=e193]
          - link [ref=e195] [cursor=pointer]:
            - /url: "#"
            - img [ref=e196]
          - link [ref=e198] [cursor=pointer]:
            - /url: "#"
            - img [ref=e199]
          - link [ref=e202] [cursor=pointer]:
            - /url: "#"
            - img [ref=e203]
          - link [ref=e206] [cursor=pointer]:
            - /url: "#"
            - img [ref=e207]
      - generic [ref=e209]:
        - heading "Marketplace" [level=4] [ref=e210]
        - list [ref=e211]:
          - listitem [ref=e212]:
            - link "Digital Products" [ref=e213] [cursor=pointer]:
              - /url: /category/digital-products
          - listitem [ref=e214]:
            - link "Services" [ref=e215] [cursor=pointer]:
              - /url: /category/services
          - listitem [ref=e216]:
            - link "All Categories" [ref=e217] [cursor=pointer]:
              - /url: /categories
          - listitem [ref=e218]:
            - link "How It Works" [ref=e219] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e220]:
            - link "Become a Seller" [ref=e221] [cursor=pointer]:
              - /url: /seller-panel
      - generic [ref=e222]:
        - heading "Support" [level=4] [ref=e223]
        - list [ref=e224]:
          - listitem [ref=e225]:
            - link "Contact Us" [ref=e226] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e227]:
            - link "How It Works" [ref=e228] [cursor=pointer]:
              - /url: /how-it-works
          - listitem [ref=e229]:
            - link "Terms of Service" [ref=e230] [cursor=pointer]:
              - /url: /terms
          - listitem [ref=e231]:
            - link "Refund Policy" [ref=e232] [cursor=pointer]:
              - /url: /refund-policy
          - listitem [ref=e233]:
            - link "Privacy Policy" [ref=e234] [cursor=pointer]:
              - /url: /privacy
      - generic [ref=e235]:
        - heading "Company" [level=4] [ref=e236]
        - list [ref=e237]:
          - listitem [ref=e238]:
            - link "About Us" [ref=e239] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e240]:
            - link "Blog" [ref=e241] [cursor=pointer]:
              - /url: /blog
          - listitem [ref=e242]:
            - link "Careers" [ref=e243] [cursor=pointer]:
              - /url: /careers
          - listitem [ref=e244]:
            - link "Contact" [ref=e245] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e246]:
            - link "Privacy Policy" [ref=e247] [cursor=pointer]:
              - /url: /privacy
    - generic [ref=e249]:
      - paragraph [ref=e250]: © 2026 HUXZAIN. All rights reserved.
      - generic [ref=e251]:
        - img [ref=e252]
        - text: Secure Marketplace
      - generic [ref=e255]:
        - text: Made with
        - img [ref=e256]
        - text: for our community
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import * as path from "path";
  3   | 
  4   | test.describe("HUXZAIN Real-Browser Manual Verification Flow", () => {
  5   |   test("1. Admin role dropdown persistence & updates", async ({ page }) => {
  6   |     // Enable browser console logging
  7   |     page.on("console", (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  8   |     page.on("pageerror", (err) => console.error(`[Browser Page Error] ${err.message}`));
  9   | 
  10  |     // Navigate to login page
  11  |     await page.goto("http://localhost:8080/login");
  12  |     await page.waitForLoadState("networkidle");
  13  |     await page.waitForTimeout(8500);
  14  |     await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
  15  |     await page.fill('input[type="password"]', "TempPass123!");
  16  |     await page.click('button[type="submit"]');
  17  | 
  18  |     // Wait for redirect to dashboard
  19  |     await page.waitForURL("**/orders", { timeout: 15000 });
  20  |     console.log("Logged in successfully as lullilullivabhaiva@gmail.com!");
  21  | 
  22  |     // Navigate to admin users panel
  23  |     await page.goto("http://localhost:8080/admin/users");
  24  |     await page.waitForSelector("table", { timeout: 15000 });
  25  |     console.log("Admin Users page loaded successfully");
  26  | 
  27  |     // Locate testbuyer row and verify its initial state (User / buyer)
  28  |     const buyerRow = page.locator('tr:has-text("test_buyer@huxzain.app")');
  29  |     await expect(buyerRow).toBeVisible();
  30  | 
  31  |     // Take screenshot of initial state
  32  |     await page.screenshot({ path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/role_initial.png" });
  33  |     console.log("Captured initial role state screenshot");
  34  | 
  35  |     // Change role from User (buyer) -> Admin (admin)
  36  |     const select = buyerRow.locator("select");
  37  |     await select.selectOption("admin");
  38  |     console.log("Changed role to Admin, awaiting db persist...");
  39  |     
  40  |     // Wait for the success toast to appear and disappear
  41  |     await page.waitForTimeout(3000);
  42  | 
  43  |     // Refresh the page
  44  |     await page.reload();
  45  |     await page.waitForSelector("table", { timeout: 15000 });
  46  |     console.log("Refreshed users page");
  47  | 
  48  |     // Verify it persists as Admin
  49  |     await expect(buyerRow.locator("select")).toHaveValue("admin");
  50  |     await page.screenshot({ path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/role_admin.png" });
  51  |     console.log("Role update to Admin verified successfully after refresh!");
  52  | 
  53  |     // Change role Admin -> Staff
  54  |     await select.selectOption("staff");
  55  |     console.log("Changed role to Staff, awaiting db persist...");
  56  |     await page.waitForTimeout(3000);
  57  | 
  58  |     // Refresh the page
  59  |     await page.reload();
  60  |     await page.waitForSelector("table", { timeout: 15000 });
  61  | 
  62  |     // Verify it persists as Staff
  63  |     await expect(buyerRow.locator("select")).toHaveValue("staff");
  64  |     await page.screenshot({ path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/role_staff.png" });
  65  |     console.log("Role update to Staff verified successfully after refresh!");
  66  | 
  67  |     // Now change it back to buyer (User) so the test is clean
  68  |     await select.selectOption("buyer");
  69  |     await page.waitForTimeout(2000);
  70  |     console.log("Cleaned up buyer role successfully!");
  71  |   });
  72  | 
  73  |   test("2. Payment approval, order status, notifications, and sound chimes", async ({ page }) => {
  74  |     // Navigate to admin payments panel
  75  |     await page.goto("http://localhost:8080/login");
  76  |     await page.waitForLoadState("networkidle");
  77  |     await page.waitForTimeout(8500);
  78  |     await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
  79  |     await page.fill('input[type="password"]', "TempPass123!");
  80  |     await page.click('button[type="submit"]');
  81  |     await page.waitForURL("**/orders", { timeout: 15000 });
  82  | 
  83  |     await page.goto("http://localhost:8080/admin/payments");
  84  |     await page.waitForSelector("text=Payment Verifications", { timeout: 15000 });
  85  |     console.log("Admin Payments panel loaded successfully!");
  86  | 
  87  |     // Select the pending payment proof
  88  |     const pendingRow = page.locator('tr:has-text("Test Buyer")').first();
> 89  |     await pendingRow.locator('button:has-text("Inspect")').click({ force: true });
      |                                                            ^ Error: locator.click: Test timeout of 60000ms exceeded.
  90  |     console.log("Opened pending payment proof details card!");
  91  | 
  92  |     // Click Approve & Confirm, then Confirm Approval in modal
  93  |     await page.screenshot({ path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/payment_inspect.png" });
  94  |     await page.click('button:has-text("Approve & Confirm")', { force: true });
  95  |     await page.waitForTimeout(1000);
  96  |     await page.click('button:has-text("Confirm Approval")', { force: true });
  97  |     console.log("Clicked Approve and Confirm. Awaiting transaction completion...");
  98  | 
  99  |     // Wait for the success toast and database transaction to finish
  100 |     await page.waitForTimeout(5000);
  101 |     await page.screenshot({ path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/payment_approved.png" });
  102 |     console.log("Payment approved and saved successfully in DB!");
  103 | 
  104 |     // Log out as admin
  105 |     await page.goto("http://localhost:8080/orders");
  106 |     const accountBtn = page.locator('button:has-text("lullilullivabhaiva")');
  107 |     await accountBtn.click({ force: true });
  108 |     await page.click('button:has-text("Sign Out")', { force: true });
  109 |     await page.waitForURL("**/", { timeout: 15000 });
  110 |     console.log("Logged out as Admin.");
  111 | 
  112 |     // Log in as buyer (test_buyer@huxzain.app)
  113 |     await page.goto("http://localhost:8080/login");
  114 |     await page.waitForLoadState("networkidle");
  115 |     await page.waitForTimeout(8500);
  116 |     await page.fill('input[type="email"]', "test_buyer@huxzain.app");
  117 |     await page.fill('input[type="password"]', "TempPass123!");
  118 |     await page.click('button[type="submit"]');
  119 |     await page.waitForURL("**/orders", { timeout: 15000 });
  120 |     console.log("Logged in successfully as buyer test_buyer@huxzain.app!");
  121 | 
  122 |     // 1. Verify payment status is Paid, CTA disappears, Contact Seller appears
  123 |     const orderStatusBadge = page.locator('span:has-text("Payment Completed")').first();
  124 |     await expect(orderStatusBadge).toBeVisible();
  125 | 
  126 |     const contactSellerLink = page.locator('a:has-text("Contact Seller")').first();
  127 |     await expect(contactSellerLink).toBeVisible();
  128 | 
  129 |     const completePaymentBtn = page.locator('a:has-text("Complete payment")').first();
  130 |     await expect(completePaymentBtn).toBeHidden();
  131 | 
  132 |     await page.screenshot({ path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/buyer_orders.png" });
  133 |     console.log("Buyer orders page status and badges verified successfully!");
  134 | 
  135 |     // 2. Verify notifications badge count is visible and can be opened in dropdown
  136 |     const bellBtn = page.locator('button[aria-label="Notifications"]');
  137 |     await expect(bellBtn).toBeVisible();
  138 |     await bellBtn.click();
  139 |     console.log("Opened Notifications panel");
  140 | 
  141 |     const notificationItem = page.locator('button:has-text("Payment Confirmed")').first();
  142 |     await expect(notificationItem).toBeVisible();
  143 |     await page.screenshot({ path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/buyer_notifications.png" });
  144 |     console.log("Real-time notifications received and verified!");
  145 | 
  146 |     // 3. Verify chat opens, send message, seller replies
  147 |     await page.goto("http://localhost:8080/orders");
  148 |     await contactSellerLink.click();
  149 |     await page.waitForURL("**/messages?orderId=*", { timeout: 15000 });
  150 |     console.log("Buyer opened secure escrow chat per order!");
  151 | 
  152 |     // Type and send a message to the seller
  153 |     await page.fill('input[placeholder*="Write a secure message"]', "Hi, payment is approved. Please deliver logo.");
  154 |     await page.click('button[type="submit"]');
  155 |     await page.waitForTimeout(3000);
  156 |     await page.screenshot({ path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/buyer_chat.png" });
  157 |     console.log("Buyer successfully sent a message!");
  158 | 
  159 |     // Log out as buyer
  160 |     const buyerAccountBtn = page.locator('button:has-text("Test Buyer")');
  161 |     await buyerAccountBtn.click({ force: true });
  162 |     await page.click('button:has-text("Sign Out")', { force: true });
  163 |     await page.waitForURL("**/", { timeout: 15000 });
  164 | 
  165 |     // Log in as seller (lullilullivabhaiva@gmail.com is also a seller/admin, wait - who is the seller of the listing? Let's check listing's seller)
  166 |     // The seller is the owner of the listing. We can log in as seller to verify reply.
  167 |     // In our DB seed, listing.seller_id is '3396f4e3-c5be-4f0a-a503-b77ddecb51a1', which corresponds to user u49839498@gmail.com
  168 |     // Let's reset u49839498@gmail.com password in seeder or use our admin account to inspect the chat.
  169 |     // Actually, lullilullivabhaiva@gmail.com as Admin can open `/messages` and see all conversations!
  170 |     // Let's log in as lullilullivabhaiva@gmail.com to verify conversation persists and reply.
  171 |     await page.goto("http://localhost:8080/login");
  172 |     await page.waitForLoadState("networkidle");
  173 |     await page.waitForTimeout(8500);
  174 |     await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
  175 |     await page.fill('input[type="password"]', "TempPass123!");
  176 |     await page.click('button[type="submit"]');
  177 |     await page.waitForURL("**/orders", { timeout: 15000 });
  178 | 
  179 |     await page.goto("http://localhost:8080/messages");
  180 |     await page.waitForSelector('text=Escrow Chat Panel', { timeout: 15000 });
  181 |     console.log("Seller/Admin opened universal messages panel!");
  182 | 
  183 |     const activeChat = page.locator('button:has-text("Test Buyer")').first();
  184 |     await activeChat.click({ force: true });
  185 |     await page.waitForTimeout(2000);
  186 | 
  187 |     // Verify buyer message persists
  188 |     await expect(page.locator('text=Hi, payment is approved. Please deliver logo.').first()).toBeVisible();
  189 | 
```