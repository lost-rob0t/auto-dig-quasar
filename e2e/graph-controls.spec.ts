import { expect, test } from "@playwright/test";

test("uses left click select, left drag pan, and right drag box select", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/graph");

  const suffix = Date.now().toString(36);
  const stage = page.locator(".graph-stage");
  await stage.click({ button: "right", position: { x: 220, y: 220 } });
  await page.getByRole("button", { name: "Create person here" }).click();

  const editor = page.getByRole("dialog", { name: "New Person" });
  await editor.getByLabel(/^First Name/).fill(`Control-${suffix}`);
  await editor.getByLabel(/^Last Name/).fill(`Test-${suffix}`);
  await editor.getByLabel(/^Display Name/).fill(`Control Test ${suffix}`);
  await editor.getByRole("button", { name: "Save" }).click();

  const selectionHeading = page.locator(".graph-inspector h2").first();
  await expect(page.locator(".graph-count")).toContainText("nodes");
  await expect(selectionHeading).toContainText("1");

  const dismissNotice = page.getByRole("button", { name: "Dismiss notification" });
  if (await dismissNotice.isVisible()) await dismissNotice.click();

  await page.getByRole("button", { name: "Focus selection" }).click();
  await page.waitForTimeout(400);

  const bounds = await stage.boundingBox();
  expect(bounds).not.toBeNull();
  const width = bounds?.width || 0;
  const height = bounds?.height || 0;
  const origin = { x: bounds?.x || 0, y: bounds?.y || 0 };
  const center = {
    x: Math.round(width / 2),
    y: Math.round(height / 2)
  };
  const background = {
    x: 100,
    y: Math.max(100, Math.round(height - 100))
  };
  const panStart = {
    x: 180,
    y: Math.max(180, Math.round(height - 170))
  };
  const panEnd = {
    x: 480,
    y: Math.max(300, Math.round(height - 50))
  };

  await page.mouse.move(origin.x + center.x, origin.y + center.y);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(200);

  await stage.click({ position: background });
  await expect(selectionHeading).toContainText("0");

  await stage.click({ position: center });
  await expect(selectionHeading).toContainText("1");

  await stage.click({ position: background });
  await page.mouse.move(origin.x + panStart.x, origin.y + panStart.y);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(origin.x + panEnd.x, origin.y + panEnd.y, { steps: 12 });
  await page.mouse.up({ button: "left" });

  await stage.click({ button: "right", position: center });
  await expect(page.getByRole("menu", { name: "canvas actions" })).toBeVisible();
  await page.keyboard.press("Escape");

  const shifted = {
    x: center.x + (panEnd.x - panStart.x),
    y: center.y + (panEnd.y - panStart.y)
  };
  await stage.click({ button: "right", position: shifted });
  await expect(page.getByRole("menu", { name: "node actions" })).toBeVisible();
  await page.keyboard.press("Escape");

  await stage.click({ position: background });
  await expect(selectionHeading).toContainText("0");

  await page.mouse.move(origin.x + shifted.x - 70, origin.y + shifted.y - 70);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(origin.x + shifted.x + 70, origin.y + shifted.y + 70, { steps: 10 });
  await page.mouse.up({ button: "right" });

  await expect(selectionHeading).toContainText("1");
  await expect(page.getByRole("menu", { name: /actions/ })).toBeHidden();
});
