import { expect, test } from "@playwright/test";

const communityUrl = "https://discord.gg/R3VY8wr86Y";

test("exposes the StarIntel community link in the desktop shared shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const community = page.locator(".sidebar-foot").getByRole("link", { name: "Discord" });
  await expect(community).toBeVisible();
  await expect(community).toHaveAttribute("href", communityUrl);
  await expect(community).toHaveAttribute("target", "_blank");
  await expect(community).toHaveAttribute("rel", /noopener/);
});
