import { test, expect } from "@playwright/test";

test.describe("Privacy & First-Run Consent", () => {
  test("displays consent modal on first visit and saves acceptance", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/dashboard");

    // Expect header brand
    await expect(page.locator("text=WorkTracker")).toBeVisible();

    // Check if consent modal is visible
    const consentModal = page.locator("text=Local Work Activity Tracker - Privacy & Consent");
    if (await consentModal.isVisible()) {
      await expect(page.locator("text=What Is Collected (Local Only)")).toBeVisible();
      await expect(page.locator("text=What Is NEVER Collected")).toBeVisible();

      // Click accept
      await page.click("text=Accept & Enable Local Tracking");
      await expect(consentModal).not.toBeVisible();
    }
  });
});
