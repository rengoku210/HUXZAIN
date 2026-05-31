# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: live-verification.spec.ts >> HUXZAIN Final Live Verification E2E Suite >> Verify Buy Now checkout redirect and role permissions end-to-end
- Location: e2e\live-verification.spec.ts:17:3

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  locator('tr:has-text("test_buyer@huxzain.app")').locator('select')
Expected: "admin"
Received: "staff"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for locator('tr:has-text("test_buyer@huxzain.app")').locator('select')
    14 × locator resolved to <select class="bg-surface/80 border border-border/80 rounded-xl px-2.5 py-1 text-xs text-foreground font-medium outline-none focus:border-gold/50 cursor-pointer">…</select>
       - unexpected value "staff"

```

```yaml
- combobox:
  - option "User"
  - option "Staff" [selected]
  - option "Sub Admin"
  - option "Admin"
  - option "Super Admin"
```

# Test source

```ts
  92  |     // Verify redirect or success modal
  93  |     await page.waitForSelector("text=Success", { timeout: 15000 });
  94  |     await page.screenshot({ 
  95  |       path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/payment_proof_submitted.png"
  96  |     });
  97  |     console.log("Checkout payment proof upload verified successfully!");
  98  | 
  99  |     // -------------------------------------------------------------
  100 |     // FLOW 1B: ADD TO CART & CART CHECKOUT FLOW
  101 |     // -------------------------------------------------------------
  102 |     console.log("\nStarting Flow 1B: Add to Cart & Cart Checkout Flow...");
  103 | 
  104 |     // 1. Navigate back to a product listing page
  105 |     await page.goto("http://localhost:8080/");
  106 |     await page.waitForLoadState("networkidle");
  107 |     await productCard.click();
  108 |     await page.waitForURL("**/product/*", { timeout: 15000 });
  109 |     await page.waitForTimeout(1000);
  110 | 
  111 |     // 2. Click Add to Cart
  112 |     const addToCartBtn = page.locator('button:has-text("Add to Cart")');
  113 |     await expect(addToCartBtn).toBeVisible();
  114 |     await expect(addToCartBtn).toBeEnabled();
  115 |     console.log("Add to Cart button found. Clicking...");
  116 |     await addToCartBtn.click();
  117 |     await page.waitForTimeout(1000);
  118 | 
  119 |     // 3. Verify cart count badge updates to 1
  120 |     const cartBadge = page.locator('button[aria-label="Cart"] span');
  121 |     await expect(cartBadge).toHaveText("1", { timeout: 5000 });
  122 |     console.log("Cart badge count updated to 1 successfully!");
  123 | 
  124 |     // 4. Click Cart Icon to open Cart drawer
  125 |     const cartIconBtn = page.locator('button[aria-label="Cart"]');
  126 |     await cartIconBtn.click();
  127 |     console.log("Opened Cart drawer.");
  128 | 
  129 |     // 5. Verify Checkout Now button is visible and click it
  130 |     const checkoutNowBtn = page.locator('button:has-text("Checkout Now")');
  131 |     await expect(checkoutNowBtn).toBeVisible();
  132 |     console.log("Checkout Now button found in Cart drawer. Clicking...");
  133 |     await checkoutNowBtn.click();
  134 | 
  135 |     // 6. Verify it redirects to checkout payment page
  136 |     await page.waitForURL("**/checkout/payment?*", { timeout: 20000 });
  137 |     console.log("Cart Checkout successfully created order and redirected to payment page!");
  138 | 
  139 |     // Proceed to upload payment proof for the cart order
  140 |     const cartProceedBtn = page.locator('button:has-text("I Paid / Confirm Payment")');
  141 |     await expect(cartProceedBtn).toBeVisible({ timeout: 15000 });
  142 |     await cartProceedBtn.click();
  143 |     await page.fill('input[placeholder*="UTR"]', "987654321098");
  144 |     await page.setInputFiles('input[type="file"]', {
  145 |       name: "receipt.png",
  146 |       mimeType: "image/png",
  147 |       buffer: mockFileBuffer,
  148 |     });
  149 |     const cartSubmitBtn = page.locator('button:has-text("Submit Payment Proof")');
  150 |     await expect(cartSubmitBtn).toBeEnabled();
  151 |     await cartSubmitBtn.click();
  152 |     await page.waitForSelector("text=Success", { timeout: 15000 });
  153 |     console.log("Cart checkout payment proof upload verified successfully!");
  154 | 
  155 |     // Log out buyer
  156 |     await page.goto("http://localhost:8080/orders");
  157 |     await page.click('button:has-text("Test Buyer")', { force: true });
  158 |     await page.click('button:has-text("Sign Out")', { force: true });
  159 |     await page.waitForURL("**/", { timeout: 15000 });
  160 |     console.log("Buyer logged out.");
  161 | 
  162 |     // -------------------------------------------------------------
  163 |     // FLOW 2: ROLE PERSISTENCE & PERMISSION ENFORCEMENT
  164 |     // -------------------------------------------------------------
  165 |     console.log("\nStarting Flow 2: Role Persistence & Permission Enforcement...");
  166 | 
  167 |     // 1. Log in as whitelist Admin
  168 |     await page.goto("http://localhost:8080/login");
  169 |     await page.waitForLoadState("networkidle");
  170 |     await page.waitForTimeout(2000);
  171 |     await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
  172 |     await page.fill('input[type="password"]', "TempPass123!");
  173 |     await page.click('button[type="submit"]');
  174 |     await page.waitForURL("**/orders", { timeout: 15000 });
  175 |     console.log("Admin logged in successfully.");
  176 | 
  177 |     // 2. Navigate to admin users and select testbuyer
  178 |     await page.goto("http://localhost:8080/admin/users");
  179 |     await page.waitForSelector("table", { timeout: 15000 });
  180 |     const testBuyerRow = page.locator('tr:has-text("test_buyer@huxzain.app")');
  181 |     await expect(testBuyerRow).toBeVisible();
  182 | 
  183 |     // A) Promote testbuyer to Admin
  184 |     const roleSelect = testBuyerRow.locator("select");
  185 |     await roleSelect.selectOption("admin");
  186 |     console.log("Selected Admin role for testbuyer.");
  187 |     await page.waitForTimeout(1500);
  188 | 
  189 |     // Refresh `/admin/users` and confirm role is saved and persists
  190 |     await page.reload();
  191 |     await page.waitForSelector("table", { timeout: 15000 });
> 192 |     await expect(testBuyerRow.locator("select")).toHaveValue("admin");
      |                                                  ^ Error: expect(locator).toHaveValue(expected) failed
  193 |     console.log("Admin role persistence verified successfully after refresh!");
  194 | 
  195 |     // Take screenshot of role admin save
  196 |     await page.screenshot({ 
  197 |       path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/role_admin_saved_refresh.png"
  198 |     });
  199 | 
  200 |     // Log out Admin
  201 |     await page.goto("http://localhost:8080/orders");
  202 |     await page.click('button:has-text("lullilullivabhaiva")', { force: true });
  203 |     await page.click('button:has-text("Sign Out")', { force: true });
  204 |     await page.waitForURL("**/", { timeout: 15000 });
  205 | 
  206 |     // Login as promoted Admin and verify full admin permissions active
  207 |     await page.goto("http://localhost:8080/login");
  208 |     await page.waitForLoadState("networkidle");
  209 |     await page.waitForTimeout(2000);
  210 |     await page.fill('input[type="email"]', "test_buyer@huxzain.app");
  211 |     await page.fill('input[type="password"]', "TempPass123!");
  212 |     await page.click('button[type="submit"]');
  213 |     await page.waitForURL("**/orders", { timeout: 15000 });
  214 | 
  215 |     // Navigate to admin console
  216 |     await page.goto("http://localhost:8080/admin");
  217 |     await page.waitForSelector("text=Admin Console", { timeout: 15000 });
  218 |     
  219 |     // Verify full admin panel visibility (e.g. Users sidebar element is visible)
  220 |     const usersSidebarLink = page.locator('aside a', { hasText: "Users" });
  221 |     await expect(usersSidebarLink).toBeVisible();
  222 |     console.log("Full Admin permissions verified active successfully!");
  223 | 
  224 |     await page.screenshot({ 
  225 |       path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/login_admin_permissions.png"
  226 |     });
  227 | 
  228 |     // Log out promoted user
  229 |     await page.goto("http://localhost:8080/orders");
  230 |     await page.click('button:has-text("Test Buyer")', { force: true });
  231 |     await page.click('button:has-text("Sign Out")', { force: true });
  232 |     await page.waitForURL("**/", { timeout: 15000 });
  233 | 
  234 |     // B) Re-log in as whitelist Admin to demote to Staff
  235 |     await page.goto("http://localhost:8080/login");
  236 |     await page.waitForLoadState("networkidle");
  237 |     await page.waitForTimeout(2000);
  238 |     await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
  239 |     await page.fill('input[type="password"]', "TempPass123!");
  240 |     await page.click('button[type="submit"]');
  241 |     await page.waitForURL("**/orders", { timeout: 15000 });
  242 | 
  243 |     // Navigate to admin users
  244 |     await page.goto("http://localhost:8080/admin/users");
  245 |     await page.waitForSelector("table", { timeout: 15000 });
  246 | 
  247 |     // Change role from Admin -> Staff
  248 |     await roleSelect.selectOption("staff");
  249 |     console.log("Selected Staff role for testbuyer.");
  250 |     await page.waitForTimeout(1500);
  251 | 
  252 |     // Refresh and confirm role remains Staff
  253 |     await page.reload();
  254 |     await page.waitForSelector("table", { timeout: 15000 });
  255 |     await expect(testBuyerRow.locator("select")).toHaveValue("staff");
  256 |     console.log("Staff role persistence verified successfully after refresh!");
  257 | 
  258 |     // Capture screenshot
  259 |     await page.screenshot({ 
  260 |       path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/role_staff_saved_refresh.png"
  261 |     });
  262 | 
  263 |     // Log out whitelist Admin
  264 |     await page.goto("http://localhost:8080/orders");
  265 |     await page.click('button:has-text("lullilullivabhaiva")', { force: true });
  266 |     await page.click('button:has-text("Sign Out")', { force: true });
  267 |     await page.waitForURL("**/", { timeout: 15000 });
  268 | 
  269 |     // Login as promoted Staff and verify restricted permissions active
  270 |     await page.goto("http://localhost:8080/login");
  271 |     await page.waitForLoadState("networkidle");
  272 |     await page.waitForTimeout(2000);
  273 |     await page.fill('input[type="email"]', "test_buyer@huxzain.app");
  274 |     await page.fill('input[type="password"]', "TempPass123!");
  275 |     await page.click('button[type="submit"]');
  276 |     await page.waitForURL("**/orders", { timeout: 15000 });
  277 | 
  278 |     // Navigate to admin console
  279 |     await page.goto("http://localhost:8080/admin/payments");
  280 |     await page.waitForSelector("text=Admin Console", { timeout: 15000 });
  281 | 
  282 |     // Confirm ONLY Payments, Subscriptions, and Support Tickets links exist, and others are hidden
  283 |     const paymentsLink = page.locator('aside a', { hasText: "Payments" });
  284 |     const subsLink = page.locator('aside a', { hasText: "Subscriptions" });
  285 |     const ticketsLink = page.locator('aside a', { hasText: "Support Tickets" });
  286 |     const hiddenUsersLink = page.locator('aside a', { hasText: "Users" });
  287 | 
  288 |     await expect(paymentsLink).toBeVisible();
  289 |     await expect(subsLink).toBeVisible();
  290 |     await expect(ticketsLink).toBeVisible();
  291 |     await expect(hiddenUsersLink).toBeHidden();
  292 |     console.log("Staff permissions (restricted access) verified active successfully!");
```