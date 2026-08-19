import { expect, test } from "@playwright/test";

test("keeps the desktop graph inside the shared navigation shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/graph");

  await expect(page.locator(".graph-stage")).toBeVisible();
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator(".topbar")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Graph", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );

  const viewport = await page.evaluate(() => {
    const sidebar = document.querySelector(".sidebar")?.getBoundingClientRect();
    const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
    const workbench = document.querySelector(".graph-workbench")?.getBoundingClientRect();
    return {
      sidebar,
      topbar,
      workbench,
      width: window.innerWidth,
      height: window.innerHeight
    };
  });

  expect(viewport.workbench?.left).toBeGreaterThanOrEqual(viewport.sidebar?.right || 0);
  expect(viewport.workbench?.top).toBeGreaterThanOrEqual(viewport.topbar?.bottom || 0);
  expect(viewport.workbench?.right).toBeLessThanOrEqual(viewport.width);
  expect(viewport.workbench?.bottom).toBeLessThanOrEqual(viewport.height);
});
