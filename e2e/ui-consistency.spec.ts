import { expect, test, type Page } from "@playwright/test";

const routes = ["/", "/graph", "/datasets", "/documents", "/actors", "/tipline", "/import", "/settings", "/about"];

async function shellGeometry(page: Page) {
  const sidebar = await page.locator(".quasar-shell > .sidebar").boundingBox();
  const topbar = await page.locator(".quasar-shell .topbar").boundingBox();
  if (!sidebar || !topbar) throw new Error("Quasar shell geometry is unavailable");
  return { sidebarWidth: Math.round(sidebar.width), topbarHeight: Math.round(topbar.height), topbarY: Math.round(topbar.y) };
}

test("Auto-Dig routes share one Quasar shell and active navigation item", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let reference = null;
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator(".quasar-shell")).toBeVisible();
    await expect(page.locator('.quasar-shell > .sidebar nav .nav-link[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator(".status-summary")).toHaveCount(1);
    const geometry = await shellGeometry(page);
    reference ||= geometry;
    expect(geometry).toEqual(reference);
  }
});

test("datasets is independent from documents", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/datasets");
  await expect(page.getByRole("heading", { name: "Datasets" })).toBeVisible();
  await expect(page.locator('.sidebar a[href="/datasets"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator('.sidebar a[href="/documents"]')).not.toHaveAttribute("aria-current", "page");
});

test("graph workspace stays inside the global Auto-Dig shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/graph?review=all");
  await expect(page.locator(".quasar-shell > .sidebar")).toBeVisible();
  await expect(page.locator(".quasar-shell .topbar")).toBeVisible();
  await expect(page.locator(".graph-workspace-host")).toBeVisible();
  await expect(page.locator(".graph-workspace-top")).toBeVisible();
});

test("mobile gesture menu uses the same route model", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/datasets");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Navigation" });
  const navigation = dialog.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation.getByRole("link", { name: "Datasets", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("link", { name: "Documents", exact: true })).not.toHaveAttribute("aria-current", "page");
});
