import { test, expect } from "@playwright/test";

test.describe("Data Purge Dialog", () => {
  test("requires confirmation string before enabling purge button", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/settings");

    const clearBtn = page.locator("button:has-text('Clear All Data')");
    await clearBtn.click();

    await expect(page.locator("text=Confirm Data Purge")).toBeVisible();

    const confirmBtn = page.locator("button:has-text('Confirm Purge')");
    await expect(confirmBtn).toBeDisabled();

    const input = page.locator("input[placeholder='Type DELETE_ALL_DATA']");
    await input.fill("DELETE_ALL_DATA");
    await expect(confirmBtn).toBeEnabled();

    // Cancel modal
    await page.click("button:has-text('Cancel')");
    await expect(page.locator("text=Confirm Data Purge")).not.toBeVisible();
  });
});
