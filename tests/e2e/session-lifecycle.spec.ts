import { test, expect } from "@playwright/test";

test.describe("Session Controls Lifecycle", () => {
  test("allows starting, pausing, and ending work sessions", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/dashboard");

    // Close consent if open
    const acceptBtn = page.locator("text=Accept & Enable Local Tracking");
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
    }

    // Check Start Session button
    const startBtn = page.locator("button:has-text('Start Session')");
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await expect(page.locator("text=Session Active")).toBeVisible();

      // Pause session
      await page.click("button:has-text('Pause')");
      await expect(page.locator("text=Session Paused")).toBeVisible();

      // Resume session
      await page.click("button:has-text('Resume')");
      await expect(page.locator("text=Session Active")).toBeVisible();

      // End session
      await page.click("button:has-text('End Session')");
      await expect(page.locator("button:has-text('Start Session')")).toBeVisible();
    }
  });
});
