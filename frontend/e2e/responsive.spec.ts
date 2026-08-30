import { test, expect } from "@playwright/test";
const routes = [
  "/",
  "/assignments",
  "/calendar",
  "/planner",
  "/focus",
  "/stats",
  "/settings",
  "/login",
];
test("all routes fit the viewport", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(
      dimensions.scroll,
      `${route} should not overflow horizontally`,
    ).toBeLessThanOrEqual(dimensions.client);
  }
});
