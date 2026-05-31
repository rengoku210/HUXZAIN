import { test, expect } from "@playwright/test";
import * as path from "path";

test.describe("HUXZAIN Final Live Verification E2E Suite", () => {
  // Set up console error listeners to capture any JS errors
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`[Browser Console Error] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      console.error(`[Browser Page JS Exception] ${err.message}`);
    });
  });

  test("Verify Buy Now checkout redirect and role permissions end-to-end", async ({ page }) => {
    // Set a high timeout to prevent Playwright from exiting prematurely
    test.setTimeout(120000);

    // -------------------------------------------------------------
    // FLOW 1: BUY NOW FLOW
    // -------------------------------------------------------------
    console.log("Starting Flow 1: Buy Now Flow...");

    // 1. Log in as test buyer
    await page.goto("http://localhost:8080/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Allow auth ready state to load
    await page.fill('input[type="email"]', "test_buyer@huxzain.app");
    await page.fill('input[type="password"]', "TempPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/orders", { timeout: 15000 });
    console.log("Buyer test_buyer@huxzain.app logged in successfully.");

    // 2. Navigate to Home Page and click first product listing
    await page.goto("http://localhost:8080/");
    await page.waitForLoadState("networkidle");
    console.log("Homepage loaded.");

    // Find first product card link or navigation
    const productCard = page.locator('a[href^="/product/"]').first();
    await expect(productCard).toBeVisible({ timeout: 15000 });
    const productUrl = await productCard.getAttribute("href");
    console.log(`Clicking product: ${productUrl}`);
    await productCard.click();
    await page.waitForURL("**/product/*", { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 3. Click Buy Now and verify instant redirect
    const buyNowBtn = page.locator('button:has-text("Buy Now")');
    await expect(buyNowBtn).toBeVisible();
    await expect(buyNowBtn).toBeEnabled();
    console.log("Buy Now button found and active. Clicking...");
    await buyNowBtn.click();

    // Verify it redirects to /checkout/payment
    await page.waitForURL("**/checkout/payment?*", { timeout: 20000 });
    console.log("Redirected to checkout payment page successfully!");
    await page.waitForTimeout(1500);

    // Capture screenshot of Checkout redirect
    await page.screenshot({ 
      path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/buy_now_checkout_redirect.png",
      fullPage: false
    });
    console.log("Captured Buy Now -> Checkout redirect screenshot!");

    // Click proceed to upload step
    const proceedBtn = page.locator('button:has-text("I Paid / Confirm Payment")');
    await expect(proceedBtn).toBeVisible({ timeout: 15000 });
    await proceedBtn.click();
    console.log("Clicked proceed to upload payment proof step.");

    // 4. Fill in mock transaction details and upload mock screenshot proof
    await page.fill('input[placeholder*="UTR"]', "123456789012");
    
    // Create a mock receipt image buffer for the upload field
    const mockFileBuffer = Buffer.from("mock-png-receipt");
    await page.setInputFiles('input[type="file"]', {
      name: "receipt.png",
      mimeType: "image/png",
      buffer: mockFileBuffer,
    });
    console.log("Attached mock payment proof receipt.");

    // Submit payment proof
    const submitBtn = page.locator('button:has-text("Submit Payment Proof")');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify redirect or success modal
    await page.waitForSelector("text=Success", { timeout: 15000 });
    await page.screenshot({ 
      path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/payment_proof_submitted.png"
    });
    console.log("Checkout payment proof upload verified successfully!");

    // -------------------------------------------------------------
    // FLOW 1B: ADD TO CART & CART CHECKOUT FLOW
    // -------------------------------------------------------------
    console.log("\nStarting Flow 1B: Add to Cart & Cart Checkout Flow...");

    // 1. Navigate back to a product listing page
    await page.goto("http://localhost:8080/");
    await page.waitForLoadState("networkidle");
    await productCard.click();
    await page.waitForURL("**/product/*", { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 2. Click Add to Cart
    const addToCartBtn = page.locator('button:has-text("Add to Cart")');
    await expect(addToCartBtn).toBeVisible();
    await expect(addToCartBtn).toBeEnabled();
    console.log("Add to Cart button found. Clicking...");
    await addToCartBtn.click();
    await page.waitForTimeout(1000);

    // 3. Verify cart count badge updates to 1
    const cartBadge = page.locator('button[aria-label="Cart"] span');
    await expect(cartBadge).toHaveText("1", { timeout: 5000 });
    console.log("Cart badge count updated to 1 successfully!");

    // 4. Click Cart Icon to open Cart drawer
    const cartIconBtn = page.locator('button[aria-label="Cart"]');
    await cartIconBtn.click();
    console.log("Opened Cart drawer.");

    // 5. Verify Checkout Now button is visible and click it
    const checkoutNowBtn = page.locator('button:has-text("Checkout Now")');
    await expect(checkoutNowBtn).toBeVisible();
    console.log("Checkout Now button found in Cart drawer. Clicking...");
    await checkoutNowBtn.click();

    // 6. Verify it redirects to checkout payment page
    await page.waitForURL("**/checkout/payment?*", { timeout: 20000 });
    console.log("Cart Checkout successfully created order and redirected to payment page!");

    // Proceed to upload payment proof for the cart order
    const cartProceedBtn = page.locator('button:has-text("I Paid / Confirm Payment")');
    await expect(cartProceedBtn).toBeVisible({ timeout: 15000 });
    await cartProceedBtn.click();
    await page.fill('input[placeholder*="UTR"]', "987654321098");
    await page.setInputFiles('input[type="file"]', {
      name: "receipt.png",
      mimeType: "image/png",
      buffer: mockFileBuffer,
    });
    const cartSubmitBtn = page.locator('button:has-text("Submit Payment Proof")');
    await expect(cartSubmitBtn).toBeEnabled();
    await cartSubmitBtn.click();
    await page.waitForSelector("text=Success", { timeout: 15000 });
    console.log("Cart checkout payment proof upload verified successfully!");

    // Log out buyer
    await page.goto("http://localhost:8080/orders");
    await page.click('button:has-text("Test Buyer")', { force: true });
    await page.click('button:has-text("Sign Out")', { force: true });
    await page.waitForURL("**/", { timeout: 15000 });
    console.log("Buyer logged out.");

    // -------------------------------------------------------------
    // FLOW 2: ROLE PERSISTENCE & PERMISSION ENFORCEMENT
    // -------------------------------------------------------------
    console.log("\nStarting Flow 2: Role Persistence & Permission Enforcement...");

    // 1. Log in as whitelist Admin
    await page.goto("http://localhost:8080/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
    await page.fill('input[type="password"]', "TempPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/orders", { timeout: 15000 });
    console.log("Admin logged in successfully.");

    // 2. Navigate to admin users and select testbuyer
    await page.goto("http://localhost:8080/admin/users");
    await page.waitForSelector("table", { timeout: 15000 });
    const testBuyerRow = page.locator('tr:has-text("test_buyer@huxzain.app")');
    await expect(testBuyerRow).toBeVisible();

    // A) Promote testbuyer to Admin
    const roleSelect = testBuyerRow.locator("select");
    await roleSelect.selectOption("admin");
    console.log("Selected Admin role for testbuyer.");
    await page.waitForTimeout(1500);

    // Refresh `/admin/users` and confirm role is saved and persists
    await page.reload();
    await page.waitForSelector("table", { timeout: 15000 });
    await expect(testBuyerRow.locator("select")).toHaveValue("admin");
    console.log("Admin role persistence verified successfully after refresh!");

    // Take screenshot of role admin save
    await page.screenshot({ 
      path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/role_admin_saved_refresh.png"
    });

    // Log out Admin
    await page.goto("http://localhost:8080/orders");
    await page.click('button:has-text("lullilullivabhaiva")', { force: true });
    await page.click('button:has-text("Sign Out")', { force: true });
    await page.waitForURL("**/", { timeout: 15000 });

    // Login as promoted Admin and verify full admin permissions active
    await page.goto("http://localhost:8080/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', "test_buyer@huxzain.app");
    await page.fill('input[type="password"]', "TempPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/orders", { timeout: 15000 });

    // Navigate to admin console
    await page.goto("http://localhost:8080/admin");
    await page.waitForSelector("text=Admin Console", { timeout: 15000 });
    
    // Verify full admin panel visibility (e.g. Users sidebar element is visible)
    const usersSidebarLink = page.locator('aside a', { hasText: "Users" });
    await expect(usersSidebarLink).toBeVisible();
    console.log("Full Admin permissions verified active successfully!");

    await page.screenshot({ 
      path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/login_admin_permissions.png"
    });

    // Log out promoted user
    await page.goto("http://localhost:8080/orders");
    await page.click('button:has-text("Test Buyer")', { force: true });
    await page.click('button:has-text("Sign Out")', { force: true });
    await page.waitForURL("**/", { timeout: 15000 });

    // B) Re-log in as whitelist Admin to demote to Staff
    await page.goto("http://localhost:8080/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
    await page.fill('input[type="password"]', "TempPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/orders", { timeout: 15000 });

    // Navigate to admin users
    await page.goto("http://localhost:8080/admin/users");
    await page.waitForSelector("table", { timeout: 15000 });

    // Change role from Admin -> Staff
    await roleSelect.selectOption("staff");
    console.log("Selected Staff role for testbuyer.");
    await page.waitForTimeout(1500);

    // Refresh and confirm role remains Staff
    await page.reload();
    await page.waitForSelector("table", { timeout: 15000 });
    await expect(testBuyerRow.locator("select")).toHaveValue("staff");
    console.log("Staff role persistence verified successfully after refresh!");

    // Capture screenshot
    await page.screenshot({ 
      path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/role_staff_saved_refresh.png"
    });

    // Log out whitelist Admin
    await page.goto("http://localhost:8080/orders");
    await page.click('button:has-text("lullilullivabhaiva")', { force: true });
    await page.click('button:has-text("Sign Out")', { force: true });
    await page.waitForURL("**/", { timeout: 15000 });

    // Login as promoted Staff and verify restricted permissions active
    await page.goto("http://localhost:8080/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', "test_buyer@huxzain.app");
    await page.fill('input[type="password"]', "TempPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/orders", { timeout: 15000 });

    // Navigate to admin console
    await page.goto("http://localhost:8080/admin/payments");
    await page.waitForSelector("text=Admin Console", { timeout: 15000 });

    // Confirm ONLY Payments, Subscriptions, and Support Tickets links exist, and others are hidden
    const paymentsLink = page.locator('aside a', { hasText: "Payments" });
    const subsLink = page.locator('aside a', { hasText: "Subscriptions" });
    const ticketsLink = page.locator('aside a', { hasText: "Support Tickets" });
    const hiddenUsersLink = page.locator('aside a', { hasText: "Users" });

    await expect(paymentsLink).toBeVisible();
    await expect(subsLink).toBeVisible();
    await expect(ticketsLink).toBeVisible();
    await expect(hiddenUsersLink).toBeHidden();
    console.log("Staff permissions (restricted access) verified active successfully!");

    await page.screenshot({ 
      path: "C:/Users/rammo/.gemini/antigravity/brain/8a789f8e-149c-475d-8ac0-2eee8f781235/login_staff_permissions.png"
    });

    // Log out promoted user
    await page.goto("http://localhost:8080/orders");
    await page.click('button:has-text("Test Buyer")', { force: true });
    await page.click('button:has-text("Sign Out")', { force: true });
    await page.waitForURL("**/", { timeout: 15000 });

    // C) Finally reset role back to buyer (User)
    await page.goto("http://localhost:8080/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', "lullilullivabhaiva@gmail.com");
    await page.fill('input[type="password"]', "TempPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/orders", { timeout: 15000 });
    await page.goto("http://localhost:8080/admin/users");
    await page.waitForSelector("table", { timeout: 15000 });

    await roleSelect.selectOption("buyer");
    await page.waitForTimeout(1000);
    console.log("Role reset to User buyer to keep environment clean.");
  });
});
