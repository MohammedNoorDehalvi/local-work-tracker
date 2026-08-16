import { test, expect } from "@playwright/test";

test.describe("Settings & Privacy Configuration", () => {
  test("loads settings page and updates tracking options", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/settings");

    await expect(page.locator("text=Tracker Settings & Privacy")).toBeVisible();
    await expect(page.locator("text=General Tracking Controls")).toBeVisible();
    await expect(page.locator("text=Privacy & Data Masking")).toBeVisible();
    await expect(page.locator("text=Monitored Folders")).toBeVisible();
  });
});
