import { expect, test } from '@playwright/test';
import { registerViewer } from './helpers';

test('panels trap focus, close with Esc and give focus back', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerViewer(page, 'Khách Bàn Phím');
  const inboxBtn = page.getByRole('button', { name: /Hộp thư/ });
  await inboxBtn.focus();
  await inboxBtn.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/.+/);

  // Tab many times: focus never leaves the dialog
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

  // the page behind is inert while the dialog is open
  expect(await page.locator('.hud').evaluate((el) => el.hasAttribute('inert'))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await page.locator('.hud').evaluate((el) => el.hasAttribute('inert'))).toBe(false);
  await expect(inboxBtn).toBeFocused();
});

test('every button has an accessible name', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerViewer(page, 'Khách Đọc Màn Hình');
  await expect(page.locator('.hud')).toBeVisible();
  const unnamed = await page.$$eval('button', (bs) =>
    bs.filter((b) => !(b.getAttribute('aria-label') || b.textContent || '').trim() && !b.getAttribute('title')).map((b) => b.outerHTML.slice(0, 80)),
  );
  expect(unnamed).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('toasts do not animate', async ({ page }) => {
    await page.goto('/?view=2d');
    await registerViewer(page, 'Khách Ít Chuyển Động');
    const toast = page.locator('.toast').first();
    await expect(toast).toBeVisible();
    expect(await toast.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});

test('motion is on by default', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerViewer(page, 'Khách Thích Chuyển Động');
  const toast = page.locator('.toast').first();
  await expect(toast).toBeVisible();
  expect(await toast.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
});
