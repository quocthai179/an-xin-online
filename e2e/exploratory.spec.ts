import { expect, test } from '@playwright/test';
import { collectErrors, registerAs, registerHr } from './helpers';

// Regression tests distilled from the exploratory session (see .squad/QA-REPORT.md).

test('BR-C5: a double-click on Thả xu spends one xu, not two', async ({ page }) => {
  const errors: string[] = [];
  collectErrors(page, 'x', errors);
  await page.goto('/?view=2d');
  await registerHr(page, 'HR Nhấp Đúp');
  await page.locator('.cand-row').nth(0).click();
  await page.getByRole('button', { name: /Thả xu/ }).dblclick();
  await expect(page.locator('.quota')).toContainText('9/10');
  await page.waitForTimeout(800); // settle: a late second drop would show up here
  await expect(page.locator('.quota')).toContainText('9/10');
  expect(errors).toEqual([]);
});

test('double-clicking "Vào phố" / "Ra ngồi" creates one user and one profile', async ({ page }) => {
  await page.goto('/?view=2d');
  await page.getByPlaceholder(/^Ví dụ/).fill('Em Nhấp Nhanh');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Vào phố' }).dblclick();
  await expect(page.locator('.me')).toContainText('Em Nhấp Nhanh');
  await page.getByRole('button', { name: /Ra ngồi/ }).click();
  const form = page.locator('.cand-form');
  await form.locator('textarea').first().fill('Nhấp đúp nút ra ngồi nhiều lần');
  await form.locator('input').first().fill('Backend Dev');
  await form.locator('input[inputmode=numeric]').first().fill('3');
  await form.locator('label:has-text("Kỹ năng") input').fill('Java');
  await form.locator('label:has-text("Giá trị liên hệ") input').fill('dev@example.com');
  await form.getByRole('checkbox', { name: /đồng ý hiển thị/ }).check();
  await form.getByRole('button', { name: 'Ra ngồi' }).dblclick();
  await expect(page.getByText('CV của Em Nhấp Nhanh')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cand-row.mine')).toHaveCount(1);
});

test('reloading mid-flow keeps the identity (the unsaved form draft is not restored)', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerAs(page, 'candidate', 'Em Tải Lại');
  await page.getByRole('button', { name: /Ra ngồi/ }).click();
  await page.locator('.cand-form textarea').first().fill('Bản nháp dở dang chưa lưu');
  await page.reload();
  await expect(page.locator('.me')).toContainText('Em Tải Lại');
});

test('markup in names is rendered as text, never as HTML', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerAs(page, 'viewer', '<b>x</b><i>y</i>');
  await expect(page.locator('.me')).toContainText('<b>x</b><i>y</i>');
  await expect(page.locator('.me b')).toHaveCount(0);
});

// DEF-2 (fixed): "Đổi người (demo)" turns this tab into a brand-new demo user.
test('"Đổi người (demo)" switches to a different user', async ({ context }) => {
  const a = await context.newPage();
  await a.goto('/?view=2d');
  await registerAs(a, 'viewer', 'Alpha Một');
  const b = await context.newPage();
  await b.goto('/?view=2d');
  await registerAs(b, 'viewer', 'Beta Hai');
  await b.getByRole('button', { name: 'Đổi người (demo)' }).click();
  await expect(b.getByRole('button', { name: 'Vào phố' })).toBeVisible({ timeout: 10_000 });
});
