import { expect, test } from "@playwright/test";

test("opens the local workspace without a backend", async ({ page }) => {
  const failedApplicationRequests: string[] = [];
  page.on("requestfailed", (request) => {
    if (["document", "script", "stylesheet"].includes(request.resourceType())) {
      failedApplicationRequests.push(request.url());
    }
  });

  await page.goto("/");

  await expect(page).toHaveTitle("Quasar");
  await expect(page.getByRole("heading", { name: "Statistics dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No documents loaded" })).toBeVisible();
  await expect(page.locator(".sync-badge")).toHaveText("offline");
  await expect(page.locator(".sync-badge")).toHaveAttribute("title", "Local only");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  expect(failedApplicationRequests).toEqual([]);
});
