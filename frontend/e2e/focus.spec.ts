import { test, expect } from "@playwright/test";
test("timer start pause resume survives navigation", async ({ page }) => {
  await page.goto("/focus");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.goto("/assignments");
  await page.goto("/focus");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
});
