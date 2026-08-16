import { test, expect } from "@playwright/test";

test.describe("Data Export & Download", () => {
  test("provides JSON and CSV export endpoints", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/settings");

    const jsonExportBtn = page.locator("a[href*='/api/export?format=json']");
    await expect(jsonExportBtn).toBeVisible();

    const csvExportBtn = page.locator("a[href*='/api/export?format=csv']");
    await expect(csvExportBtn).toBeVisible();
  });
});
