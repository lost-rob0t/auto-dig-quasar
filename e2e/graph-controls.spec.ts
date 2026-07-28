import { expect, test } from "@playwright/test";

test("uses left click select, left drag pan, and right drag box select", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/graph");

  const suffix = Date.now().toString(36);
  const stage = page.locator(".graph-stage");
  await stage.click({ button: "right", position: { x: 220, y: 220 } });
  await page.getByRole("button", { name: "Create person here" }).click();

  const editor = page.getByRole("dialog", { name: "New Person" });
  await editor.getByLabel(/^First Name/).fill("Control");
  await editor.getByLabel(/^Last Name/).fill(suffix);
  await editor.getByLabel(/^Display Name/).fill(`Control ${suffix}`);
  await editor.getByRole("button", { name: "Save" }).click();

  const selectionHeading = page.locator(".graph-inspector h2").first();
  await expect(page.locator(".graph-count")).toContainText("nodes");
  await expect(selectionHeading).toContainText("1");
  await page.getByRole("button", { name: "Focus selection" }).click();
  await page.waitForTimeout(400);

  const bounds = await stage.boundingBox();
  expect(bounds).not.toBeNull();
  const center = {
    x: Math.round((bounds?.width || 0) / 2),
    y: Math.round((bounds?.height || 0) / 2)
  };

  await page.mouse.move((bounds?.x || 0) + center.x, (bounds?.y || 0) + center.y);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(200);

  await stage.click({ position: { x: 70, y: 70 } });
  await expect(selectionHeading).toContainText("0");

  await stage.click({ position: center });
  await expect(selectionHeading).toContainText("1");

  await stage.click({ position: { x: 70, y: 70 } });
  await page.mouse.move((bounds?.x || 0) + 170, (bounds?.y || 0) + 170);
  await page.mouse.down({ button: "left" });
  await page.mouse.move((bounds?.x || 0) + 470, (bounds?.y || 0) + 290, { steps: 12 });
  await page.mouse.up({ button: "left" });

  await stage.click({ button: "right", position: center });
  await expect(page.getByRole("menu", { name: "canvas actions" })).toBeVisible();
  await page.keyboard.press("Escape");

  const shifted = { x: center.x + 300, y: center.y + 120 };
  await stage.click({ button: "right", position: shifted });
  await expect(page.getByRole("menu", { name: "node actions" })).toBeVisible();
  await page.keyboard.press("Escape");

  await stage.click({ position: { x: 70, y: 70 } });
  await expect(selectionHeading).toContainText("0");

  await page.mouse.move(
    (bounds?.x || 0) + shifted.x - 70,
    (bounds?.y || 0) + shifted.y - 70
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    (bounds?.x || 0) + shifted.x + 70,
    (bounds?.y || 0) + shifted.y + 70,
    { steps: 10 }
  );
  await page.mouse.up({ button: "right" });

  await expect(selectionHeading).toContainText("1");
  await expect(page.getByRole("menu", { name: /actions/ })).toBeHidden();
});
