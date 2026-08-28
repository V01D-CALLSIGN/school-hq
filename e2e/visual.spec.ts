import { expect, test } from "@playwright/test";
const pages = [
  { name: "dashboard", path: "/" },
  { name: "calendar", path: "/calendar" },
  { name: "focus", path: "/focus" },
] as const;
test.describe("cockpit visual regression", () => {
  for (const item of pages)
    test(`${item.name} surface`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name === "tablet-chrome",
        "390px and desktop baselines only",
      );
      await page.goto(item.path);
      await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
      if (item.name === "focus")
        await expect(
          page.getByRole("heading", { name: /momentum problem set/i }),
        ).toBeVisible();
      await expect(page).toHaveScreenshot(`${item.name}.png`, {
        fullPage: false,
        animations: "disabled",
      });
    });
  test("planner timeline", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "tablet-chrome",
      "390px and desktop baselines only",
    );
    await page.goto("/planner");
    await page.getByRole("button", { name: /parse brain dump/i }).click();
    await expect(
      page.getByRole("heading", { name: /review the details/i }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /confirm and generate plan/i })
      .click();
    await expect(
      page.getByRole("heading", { name: /your time, mapped/i }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot("planner.png", {
      fullPage: false,
      animations: "disabled",
    });
  });
});
