// scripts/mobile-responsiveness-audit.ts
// Playwright script that captures mobile screenshots of key pages and validates UI constraints.
import { test, expect } from '@playwright/test';

// Define pages to audit and their route paths.
const pages = [
  { name: 'Seller Dashboard', path: '/seller' },
  { name: 'Admin Verification Queue', path: '/admin/verification' },
  { name: 'Payment Upload Flow', path: '/checkout/upload' },
  { name: 'Checkout Page', path: '/checkout' },
  { name: 'Category Browsing', path: '/categories' },
];

// Mobile viewport size (iPhone 12 dimensions).
const viewport = { width: 390, height: 844 };

pages.forEach(({ name, path }) => {
  test.describe(`${name} – mobile audit`, () => {
    test(`${name} layout`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`http://localhost:5173${path}`);

      // Capture screenshot.
      const screenshotPath = `artifacts/qa-manual-payment-flow/mobile/${name.replace(/\s+/g, '_').toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Touch target validation: ensure any interactive element has min 44px height/width.
      const interactiveElements = await page.$$('[role="button"], a, button, input, select, textarea');
      for (const el of interactiveElements) {
        const box = await el.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }

      // Modal overflow check – ensure no element with class .modal exceeds viewport height.
      const modals = await page.$$('.modal');
      for (const modal of modals) {
        const height = await modal.evaluate((node) => node.scrollHeight);
        expect(height).toBeLessThanOrEqual(viewport.height * 0.9);
      }

      // Responsive image scaling – images with .responsive-img should fit width.
      const images = await page.$$('.responsive-img');
      for (const img of images) {
        const width = await img.evaluate((node) => (node as HTMLImageElement).naturalWidth);
        expect(width).toBeLessThanOrEqual(viewport.width);
      }
    });
  });
});
