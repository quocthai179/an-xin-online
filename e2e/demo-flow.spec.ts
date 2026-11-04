import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

// Two tabs of one browser = two people (demo mode: localStorage + BroadcastChannel).
// HR drops xu -> candidate hears it -> 500k -> accept -> bao tron -> accept -> placed.
test('HR and candidate: xu, 500k, accept, offer, placed', async ({ context }) => {
  const errors: string[] = [];

  const hr = await context.newPage();
  collectErrors(hr, 'hr', errors);
  await hr.goto('/?view=2d');
  await hr.getByPlaceholder(/^Ví dụ/).fill('Chị Lan HR');
  await hr.getByText('HR / Nhà tuyển dụng').click();
  await hr.locator('label:has-text("Công ty") input').fill('ACME');
  await hr.getByRole('checkbox').check();
  await hr.getByRole('button', { name: 'Vào phố' }).click();
  await expect(hr.locator('.hud')).toBeVisible();

  const cand = await context.newPage();
  collectErrors(cand, 'cand', errors);
  await cand.goto('/?view=2d');
  await cand.getByPlaceholder(/^Ví dụ/).fill('Em Dev Muộn');
  await cand.getByRole('checkbox').check();
  await cand.getByRole('button', { name: 'Vào phố' }).click();
  await expect(cand.locator('.hud')).toBeVisible();
  await cand.getByRole('button', { name: /Ra ngồi/ }).click();

  const form = cand.locator('.cand-form');
  await form.locator('textarea').first().fill('Test sign: xin việc remote, nhà còn mẹ già');
  await form.locator('input').first().fill('Backend Dev');
  await form.locator('input[inputmode=numeric]').first().fill('3');
  await form.locator('label:has-text("Kỹ năng") input').fill('Java, Go');
  await form.locator('label:has-text("Giá trị liên hệ") input').fill('dev@example.com');
  await form.getByRole('checkbox', { name: /đồng ý hiển thị/ }).check();
  await form.getByRole('button', { name: 'Ra ngồi' }).click();
  await expect(cand.getByText('CV của Em Dev Muộn')).toBeVisible();
  await cand.keyboard.press('Escape');

  // HR finds the candidate in the Backend zone and drops xu
  await hr.getByRole('button', { name: /Backend/ }).first().click();
  await hr.getByText('Test sign: xin việc remote').first().click();
  await expect(hr.getByText('CV của Em Dev Muộn')).toBeVisible();
  await hr.getByRole('button', { name: /Thả xu/ }).click();
  await expect(cand.locator('.toast:has-text("vừa thả xu cho bạn")')).toBeVisible();

  // 500k
  await hr.getByRole('button', { name: /Thả 500k/ }).click();
  await hr.locator('textarea').fill('Mời bạn phỏng vấn vị trí Backend nhé');
  await hr.locator('label:has-text("Cách liên hệ") input').fill('lan@acme.vn');
  await hr.getByRole('button', { name: 'Thả 500k' }).click();
  await expect(cand.locator('.toast.prominent:has-text("500k")')).toBeVisible();
  await cand.getByRole('button', { name: /Xem lời mời/ }).first().click();
  await cand.getByRole('button', { name: 'Nhận lời' }).click();
  await expect(hr.locator('.toast:has-text("nhận lời")')).toBeVisible();

  // bao tron
  await expect(hr.getByText('CV của Em Dev Muộn')).toBeVisible();
  await hr.getByRole('button', { name: /Bao trọn/ }).click();
  await hr.locator('label:has-text("Vị trí") input').fill('Backend Dev');
  await hr.locator('label:has-text("Mức lương") input').fill('30 triệu');
  await hr.getByRole('button', { name: 'Gửi offer' }).click();
  await expect(cand.locator('.toast.prominent:has-text("bao trọn")')).toBeVisible();
  await cand.getByRole('button', { name: /Xem lời mời/ }).first().click();
  await cand.getByRole('button', { name: 'Chấp nhận' }).click();
  await expect(hr.locator('.toast:has-text("vừa được bao")')).toBeVisible();
  await cand.keyboard.press('Escape');
  await cand.getByRole('button', { name: /Hồ sơ của tôi/ }).click();
  await expect(cand.locator('.notice.ok:has-text("ĐÃ ĐƯỢC BAO")')).toBeVisible();

  expect(errors).toEqual([]);
});
