import { expect, test } from '@playwright/test';
import { collectErrors, registerViewer } from './helpers';

test('3D street renders a canvas without console errors', async ({ page }) => {
  const errors: string[] = [];
  collectErrors(page, '3d', errors);
  await page.goto('/?view=3d&debug=1&t=day');
  await registerViewer(page, 'Khách Ba Chiều');
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(200);
  expect(box?.height).toBeGreaterThan(200);
  // the debug overlay only appears once the render loop is running
  await expect(page.locator('#pxv-debug')).toBeVisible({ timeout: 30_000 });
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  expect(errors).toEqual([]);
});

test('3D can be left for the accessible 2D list', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerViewer(page, 'Khách Hai Chiều');
  await expect(page.locator('.cand-row').first()).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});
