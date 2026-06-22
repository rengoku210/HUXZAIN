import { test, expect } from "@playwright/test";

test("diagnose messages layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("http://localhost:8080/login");
  await page.fill('input[type="email"]', "test_buyer@huxzain.app");
  await page.fill('input[type="password"]', "TempPass123!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await page.goto("http://localhost:8080/messages");
  await page.waitForTimeout(5000);

  const dims = await page.evaluate(() => {
    const pick = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return `${sel}: NOT FOUND`;
      const r = el.getBoundingClientRect();
      return `${sel}: ${Math.round(r.width)}x${Math.round(r.height)} @ top=${Math.round(r.top)}`;
    };
    const grid = document.querySelector("main > div:nth-child(2)") as HTMLElement | null;
    const gridInfo = grid
      ? `grid(main>div2): ${Math.round(grid.getBoundingClientRect().width)}x${Math.round(
          grid.getBoundingClientRect().height
        )} display=${getComputedStyle(grid).display} flexGrow=${getComputedStyle(grid).flexGrow}`
      : "grid: NOT FOUND";
    return [
      pick("main"),
      gridInfo,
      pick("aside"),
      pick("section"),
      `viewport: ${window.innerWidth}x${window.innerHeight}`,
      `bodyHeight: ${document.body.getBoundingClientRect().height}`,
    ].join("\n");
  });

  console.log("=== DIMENSIONS ===\n" + dims);
  console.log("=== CONSOLE ERRORS (" + errors.length + ") ===\n" + errors.join("\n"));
  await page.screenshot({ path: "e2e/_diag-messages.png", fullPage: false });
});
