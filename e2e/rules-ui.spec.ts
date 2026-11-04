import { expect, test, type Page } from '@playwright/test';
import { LIMITS } from '../src/lib/rules';
import { collectErrors, openCv, registerAs, registerHr, sitCandidate } from './helpers';

// Pause between gifts: the client enforces <= 5 gift ops/second (BR-SP1) on the real clock.
const gap = (page: Page) => page.waitForTimeout(350);

async function openSample(page: Page, index: number) {
  await page.locator('.cand-row').nth(index).click();
  await expect(page.locator('.modal, [role=dialog]').first()).toBeVisible();
}

async function dropXu(page: Page, index: number) {
  await openSample(page, index);
  await page.getByRole('button', { name: /Thả xu/ }).click();
  await expect(page.locator('.toast:has-text("Leng keng")').last()).toBeVisible();
  await page.keyboard.press('Escape');
  await gap(page);
}

test('AC-9.2/9.3 BR-C1/C2: per-candidate cap then daily quota disable the xu button with a reason', async ({ page }) => {
  const errors: string[] = [];
  collectErrors(page, 'hr', errors);
  await page.goto('/?view=2d');
  await registerHr(page, 'Chị Quota');
  await expect(page.locator('.quota')).toContainText('10/10');

  // 2 xu on the same candidate, the 3rd is disabled with the reason
  await dropXu(page, 0);
  await dropXu(page, 0);
  await openSample(page, 0);
  const xuBtn = page.getByRole('button', { name: /Thả xu/ });
  await expect(xuBtn).toBeDisabled();
  await expect(xuBtn).toHaveAttribute('title', /đủ cho người này/);
  await expect(page.locator('.reasons')).toContainText('Hôm nay đã thả đủ cho người này');
  await page.keyboard.press('Escape');

  // 8 more on four other candidates -> 10 used
  for (const i of [1, 2, 3]) {
    await dropXu(page, i);
    await dropXu(page, i);
  }
  await page.getByRole('button', { name: /Frontend/ }).first().click();
  await dropXu(page, 0);
  await dropXu(page, 0);
  await expect(page.locator('.quota')).toContainText('0/10');

  // the 11th: a fresh candidate, button disabled and reason shown
  await openSample(page, 1);
  const eleventh = page.getByRole('button', { name: /Thả xu/ });
  await expect(eleventh).toBeDisabled();
  await expect(eleventh).toHaveAttribute('title', 'Hết xu hôm nay, mai quay lại');
  await expect(page.locator('.reasons')).toContainText('Hết xu hôm nay, mai quay lại');
  expect(errors).toEqual([]);
});

test('AC-12 BR-L1: spectators drop free love coins (5/day, 1 per candidate) and never see HR xu', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerAs(page, 'viewer', 'Khách Thương');
  await expect(page.locator('.quota')).toContainText('5/5');

  await openSample(page, 0);
  await expect(page.getByRole('button', { name: /Thả xu$/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Thả xu$/ })).toHaveAttribute('title', /Đăng ký HR/);
  const before = await page.locator('dl.facts').innerText();
  await page.getByRole('button', { name: /Xu tình thương/ }).click();
  await expect(page.locator('.toast:has-text("xu tình thương")').last()).toBeVisible();
  // shown separately from HR xu (AC-12.3) and the same candidate is now blocked
  await expect(page.locator('dl.facts')).toContainText('Xu tình thương');
  await expect(page.locator('dl.facts')).toContainText('Xu HR');
  expect(await page.locator('dl.facts').innerText()).not.toBe(before);
  await expect(page.getByRole('button', { name: /Xu tình thương/ })).toBeDisabled();
  await expect(page.locator('.reasons')).toContainText('Hôm nay đã thả cho người này rồi');
  await page.keyboard.press('Escape');
  await gap(page);

  const love = async (i: number) => {
    await openSample(page, i);
    await page.getByRole('button', { name: /Xu tình thương/ }).click();
    await expect(page.getByRole('button', { name: /Xu tình thương/ })).toBeDisabled();
    await page.keyboard.press('Escape');
    await gap(page);
  };
  for (const i of [1, 2, 3]) await love(i);
  await page.getByRole('button', { name: /Frontend/ }).first().click();
  await love(0);
  await expect(page.locator('.quota')).toContainText('0/5');
  await openSample(page, 1);
  const sixth = page.getByRole('button', { name: /Xu tình thương/ });
  await expect(sixth).toBeDisabled();
  await expect(sixth).toHaveAttribute('title', 'Hết xu tình thương hôm nay');
});

test('AC-1.5: spectators are told to register as HR for 500k / bao tron', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerAs(page, 'viewer', 'Khách Tò Mò');
  await openSample(page, 0);
  await expect(page.getByRole('button', { name: /Thả 500k/ })).toBeDisabled();
  await expect(page.locator('.reasons')).toContainText('Đăng ký HR để thả 500k');
  await expect(page.getByRole('button', { name: /Bao trọn/ })).toBeDisabled();
});

test('AC-8.2 BR-Privacy: contact is hidden from HR/others and not unlocked by xu (UI)', async ({ context }) => {
  const SECRET = 'bi.mat.lien.he@example.com';
  const cand = await context.newPage();
  await cand.goto('/?view=2d');
  await sitCandidate(cand, { name: 'Em Giữ Kín', sign: 'Biển thử liên hệ ẩn: nhận việc remote', contact: SECRET });
  await expect(cand.getByText('CV của Em Giữ Kín')).toBeVisible();

  const hr = await context.newPage();
  await hr.goto('/?view=2d');
  await registerHr(hr, 'Anh Tò Mò');
  await openCv(hr, 'Biển thử liên hệ ẩn');
  await expect(hr.getByText('CV của Em Giữ Kín')).toBeVisible();
  await expect(hr.locator('.contact')).toContainText('Thả 500k để mở liên hệ');
  expect(await hr.locator('body').innerText()).not.toContain(SECRET);
  expect(await hr.content()).not.toContain(SECRET);
  // a gift of xu does not unlock it
  await hr.getByRole('button', { name: /Thả xu/ }).click();
  await expect(hr.locator('.toast:has-text("Leng keng")')).toBeVisible();
  await expect(hr.locator('.contact')).toContainText('Thả 500k để mở liên hệ');

  // a different HR still cannot see it
  const hr2 = await context.newPage();
  await hr2.goto('/?view=2d');
  await registerHr(hr2, 'HR Khác', 'Other');
  await openCv(hr2, 'Biển thử liên hệ ẩn');
  await expect(hr2.locator('.contact')).toContainText('Thả 500k để mở liên hệ');
  expect(await hr2.locator('body').innerText()).not.toContain(SECRET);
});

test('AC-8.2 BR-Privacy: contact unlocks only after the candidate ACCEPTS the 500k (UI)', async ({ context }) => {
  await context.clock.install(); // new HR accounts may only send 500k after hrInviteMinAgeMinutes
  const SECRET = 'bi.mat.lien.he@example.com';
  const cand = await context.newPage();
  await cand.goto('/?view=2d');
  await sitCandidate(cand, { name: 'Em Giữ Kín', sign: 'Biển thử liên hệ ẩn: nhận việc remote', contact: SECRET });
  await expect(cand.getByText('CV của Em Giữ Kín')).toBeVisible();

  const hr = await context.newPage();
  await hr.goto('/?view=2d');
  await registerHr(hr, 'Anh Tò Mò');
  await context.clock.fastForward((LIMITS.hrInviteMinAgeMinutes + 1) * 60_000);
  await openCv(hr, 'Biển thử liên hệ ẩn');
  await hr.getByRole('button', { name: /Thả 500k/ }).click();
  await hr.locator('textarea').fill('Mời bạn phỏng vấn vị trí Backend nhé');
  await hr.locator('label:has-text("Cách liên hệ") input').fill('anh@acme.vn');
  await hr.getByRole('button', { name: 'Thả 500k' }).click();
  await expect(cand.locator('.toast.prominent:has-text("500k")')).toBeVisible();
  // rule: still locked while the invitation is only pending
  await expect(hr.locator('.contact')).toContainText('Thả 500k để mở liên hệ');
  expect(await hr.locator('body').innerText()).not.toContain(SECRET);

  // candidate accepts -> now the HR sees it
  await cand.getByRole('button', { name: /Xem lời mời/ }).first().click();
  await cand.getByRole('button', { name: 'Nhận lời' }).click();
  await expect(hr.locator('.toast:has-text("nhận lời")')).toBeVisible();
  await expect(hr.locator('.contact')).toContainText(SECRET);
});

test('US-20 BR-M5: N distinct aged reporters hide the sign; each user reports once', async ({ context }) => {
  await context.clock.install(); // reporters count only once their profile is older than reporterMinAgeMinutes
  const N = LIMITS.reportsToHideSign;
  const SIGN = 'Biển sẽ bị báo cáo nhiều lần liên tiếp';
  const cand = await context.newPage();
  await cand.goto('/?view=2d');
  await sitCandidate(cand, { name: 'Em Bị Báo', sign: SIGN });
  await expect(cand.getByText('CV của Em Bị Báo')).toBeVisible();
  await cand.keyboard.press('Escape');

  const reporters = [];
  for (let i = 1; i <= N; i++) {
    const p = await context.newPage(); // keep pages open: a closed tab frees its demo identity for the next tab
    await p.goto('/?view=2d');
    await registerAs(p, 'viewer', `Người Báo ${i}`);
    reporters.push(p);
  }
  await context.clock.fastForward((LIMITS.reporterMinAgeMinutes + 5) * 60_000);

  for (const [i, p] of reporters.entries()) {
    await openCv(p, SIGN);
    await p.getByRole('button', { name: 'Báo cáo', exact: true }).click();
    await p.getByRole('button', { name: 'Gửi báo cáo' }).click();
    await expect(p.getByRole('button', { name: 'Đã báo cáo' })).toBeDisabled();
    if (i < N - 1) {
      await p.keyboard.press('Escape');
      await expect(cand.locator('.cand-row', { hasText: 'Em Bị Báo' }).locator('.sign-card')).toHaveText(SIGN);
    }
  }
  // the owner is told and the list shows the placeholder instead of the sign
  await expect(cand.locator('.cand-row', { hasText: 'Em Bị Báo' }).locator('.sign-card')).toHaveText('Biển đang chờ duyệt', { timeout: 15_000 });
  expect(await cand.locator('.list-view').innerText()).not.toContain(SIGN);
});

test('AC-16.2/BR-Q2: the daily fortune is identical on repeat draws and after reload', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerAs(page, 'viewer', 'Khách Xin Quẻ');
  const draw = async () => {
    await page.getByRole('button', { name: /Đền/ }).click();
    await page.getByRole('button', { name: 'Xin quẻ hôm nay' }).click();
    const card = page.locator('article.fortune');
    await expect(card).toBeVisible({ timeout: 10_000 });
    const text = await card.innerText();
    await page.keyboard.press('Escape');
    return text;
  };
  const a = await draw();
  const b = await draw();
  expect(b).toBe(a);
  await page.reload();
  await expect(page.locator('.hud')).toBeVisible();
  expect(await draw()).toBe(a);
  expect(a).toContain('Chỉ để cười');
});

test('AC-17.2: second incense of the day says come back tomorrow', async ({ page }) => {
  await page.goto('/?view=2d');
  await registerAs(page, 'viewer', 'Khách Xin Lộc');
  await page.getByRole('button', { name: /Đền/ }).click();
  await page.getByRole('button', { name: 'Thắp nhang', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mai thắp tiếp nhé' })).toBeDisabled();
});

test('AC-15 BR-Rank: xu from HR move a candidate up the zone ranking (seats re-sort on the 60 s stability tick)', async ({ context }) => {
  test.setTimeout(180_000);
  const SIGN = 'Biển leo hạng nhờ xu của HR nhé';
  const cand = await context.newPage();
  await cand.goto('/?view=2d');
  await sitCandidate(cand, { name: 'Em Leo Hạng', sign: SIGN });
  await expect(cand.getByText('CV của Em Leo Hạng')).toBeVisible();
  await cand.keyboard.press('Escape');
  const mySeat = async () => Number(await cand.locator('.cand-row.mine .seat').innerText());
  const before = await mySeat();

  for (let i = 0; i < 5; i++) {
    const hr = await context.newPage();
    await hr.goto('/?view=2d');
    await registerHr(hr, `HR Hào Phóng ${i}`, `Co${i}`);
    await openCv(hr, SIGN);
    for (let k = 0; k < 2; k++) {
      await hr.getByRole('button', { name: /Thả xu/ }).click();
      await expect(hr.locator('.toast:has-text("Leng keng")').last()).toBeVisible();
      await gap(hr);
    }
  }
  await cand.getByRole('button', { name: /Hồ sơ của tôi/ }).click();
  await expect(cand.locator('dl.facts')).toContainText('🪙 10');
  await cand.keyboard.press('Escape');
  // seats are recomputed at most once a minute (BR-Rank stability), so poll up to ~75 s
  await expect.poll(mySeat, { timeout: 80_000, intervals: [2_000] }).toBeLessThan(before);
  await expect(cand.locator('.toast:has-text("lên ghế")').first()).toBeVisible();
});
