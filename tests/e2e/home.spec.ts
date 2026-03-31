import { test, expect } from "@playwright/test";

test("home page renders primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Browse opportunities" })).toBeVisible();
});
