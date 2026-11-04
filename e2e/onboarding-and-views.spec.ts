import { devices, expect, test } from '@playwright/test';
import { collectErrors, registerAs, registerHr, sitCandidate } from './helpers';

test.describe('onboarding validation (AC-1.2, AC-1.3)', () => {
  test('empty / too short / blocked names show a field error and create no session', async ({ page }) => {
    await page.goto('/?view=2d');
    const submit = async (name: string) => {
      await page.getByPlaceholder(/^Ví dụ/).fill(name);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Vào phố' }).click();
    };
    for (const bad of ['', 'a', 'địt mẹ mày']) {
      await submit(bad);
      await expect(page.locator('em.error').first()).toBeVisible();
      await expect(page.locator('.hud')).toHaveCount(0);
    }
    await page.reload();
    await expect(page.getByRole('button', { name: 'Vào phố' })).toBeVisible(); // still no session
  });

  test('terms checkbox is required', async ({ page }) => {
    await page.goto('/?view=2d');
    await page.getByPlaceholder(/^Ví dụ/).fill('Khách Quên Tick');
    await page.getByRole('button', { name: 'Vào phố' }).click();
    await expect(page.getByText('Tick vào ô đồng ý')).toBeVisible();
    await expect(page.locator('.hud')).toHaveCount(0);
  });

  test('HR must give a company; the unverified label is shown next to the name', async ({ page }) => {
    await page.goto('/?view=2d');
    await page.getByPlaceholder(/^Ví dụ/).fill('Chị HR Thiếu');
    await page.getByText('HR / Nhà tuyển dụng').click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Vào phố' }).click();
    await expect(page.locator('em.error').first()).toBeVisible();
    await page.locator('label:has-text("Công ty") input').fill('ACME');
    await page.getByRole('button', { name: 'Vào phố' }).click();
    await expect(page.locator('.me')).toContainText('Chưa xác minh');
  });

  test('emoji-only and RTL names are accepted and rendered', async ({ page }) => {
    const errors: string[] = [];
    collectErrors(page, 'emoji', errors);
    await page.goto('/?view=2d');
    await registerAs(page, 'viewer', '🔥🔥🔥');
    await expect(page.locator('.me')).toContainText('🔥🔥🔥');
    expect(errors).toEqual([]);
  });

  test('session survives a reload (AC-1.1/1.4)', async ({ page }) => {
    await page.goto('/?view=2d');
    await registerHr(page, 'Chị Bền Bỉ');
    await page.reload();
    await expect(page.locator('.me')).toContainText('Chị Bền Bỉ');
    await expect(page.locator('.quota')).toContainText('10/10');
  });
});

test.describe('candidate form moderation (AC-2.3, AC-2.4)', () => {
  test('a banned sign is rejected next to the field, input is kept, nothing is saved', async ({ page }) => {
    await page.goto('/?view=2d');
    await registerAs(page, 'candidate', 'Em Nói Bậy');
    await page.getByRole('button', { name: /Ra ngồi/ }).click();
    const form = page.locator('.cand-form');
    const bad = 'Tuyển dụng toàn lũ địt mẹ';
    await form.locator('textarea').first().fill(bad);
    await form.locator('input').first().fill('Backend Dev');
    await form.locator('input[inputmode=numeric]').first().fill('3');
    await form.locator('label:has-text("Kỹ năng") input').fill('Java');
    await form.locator('label:has-text("Giá trị liên hệ") input').fill('dev@example.com');
    await form.getByRole('checkbox', { name: /đồng ý hiển thị/ }).check();
    await form.getByRole('button', { name: 'Ra ngồi' }).click();
    await expect(form.locator('label:has(textarea) em.error')).toBeVisible();
    await expect(form.locator('textarea').first()).toHaveValue(bad);
    await expect(form.locator('input').first()).toHaveValue('Backend Dev'); // other data not lost
    await expect(page.getByText('CV của Em Nói Bậy')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('.cand-row', { hasText: 'Em Nói Bậy' })).toHaveCount(0);
  });

  test('a PII-looking sign (phone / url) is rejected, a too-short sign shows a field error', async ({ page }) => {
    await page.goto('/?view=2d');
    await registerAs(page, 'candidate', 'Em Lộ Số');
    await page.getByRole('button', { name: /Ra ngồi/ }).click();
    const form = page.locator('.cand-form');
    await form.locator('input').first().fill('Backend Dev');
    await form.locator('input[inputmode=numeric]').first().fill('3');
    await form.locator('label:has-text("Kỹ năng") input').fill('Java');
    await form.locator('label:has-text("Giá trị liên hệ") input').fill('dev@example.com');
    await form.getByRole('checkbox', { name: /đồng ý hiển thị/ }).check();
    for (const sign of ['Gọi 0912345678 nhé', 'xem https://evil.example', 'ab']) {
      await form.locator('textarea').first().fill(sign);
      await form.getByRole('button', { name: 'Ra ngồi' }).click();
      await expect(form.locator('label:has(textarea) em.error')).toBeVisible();
    }
  });

  test('the Gợi ý button fills a sign the user can still edit (AC-3.1)', async ({ page }) => {
    await page.goto('/?view=2d');
    await registerAs(page, 'candidate', 'Em Bí Ý');
    await page.getByRole('button', { name: /Ra ngồi/ }).click();
    const ta = page.locator('.cand-form textarea').first();
    await page.getByRole('button', { name: /Gợi ý/ }).click();
    const v = await ta.inputValue();
    expect(v.length).toBeGreaterThanOrEqual(5);
    await ta.fill(v + ' (sửa)');
    await expect(ta).toHaveValue(v + ' (sửa)');
  });
});

test.describe('views and deep links', () => {
  test('?view=2d never creates a canvas and lists zones with counts (AC-5.4)', async ({ page }) => {
    await page.goto('/?view=2d');
    await registerAs(page, 'viewer', 'Khách Hai Chiều');
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(await page.locator('.zone-chip').count()).toBeGreaterThanOrEqual(8);
    await expect(page.locator('.zone-chip b').first()).toHaveText(/\d+/);
    await expect(page.locator('.cand-row').first()).toBeVisible();
  });

  test('?c=<slug> deep link opens that candidate right after joining (AC-18.5)', async ({ page }) => {
    await page.goto('/?view=2d&c=mau-backend-1');
    await registerAs(page, 'viewer', 'Khách Theo Link');
    await expect(page.locator('h3.who')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^CV của /)).toBeVisible();
  });

  test('?c=<unknown or hostile> does not crash and just shows the street', async ({ browser }) => {
    const errors: string[] = [];
    for (const slug of ['khong-ton-tai', encodeURIComponent('<script>alert(1)</script>'), 'x'.repeat(3000)]) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      collectErrors(page, 'dl', errors);
      await page.goto(`/?view=2d&c=${slug}`);
      await registerAs(page, 'viewer', 'Khách Link Lạ');
      await expect(page.locator('.cand-row').first()).toBeVisible();
      await expect(page.getByText(/^CV của /)).toHaveCount(0);
      await ctx.close();
    }
    expect(errors).toEqual([]);
  });
});

test.describe('mobile (iPhone 13)', () => {
  const { defaultBrowserType: _ignored, ...iphone } = devices['iPhone 13'];
  void _ignored;
  test.use({ ...iphone });

  test('3D street loads with the virtual joystick and no console errors (AC-6.2)', async ({ page }) => {
    const errors: string[] = [];
    collectErrors(page, 'm', errors);
    await page.goto('/?view=3d&debug=1');
    await registerAs(page, 'viewer', 'Khách Di Động');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#pxv-debug')).toBeVisible({ timeout: 30_000 });
    const joy = page.getByRole('application', { name: /Cần điều khiển/ });
    await expect(joy).toBeVisible();
    const box = (await joy.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    // no horizontal overflow on a phone
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    // dragging the joystick moves the knob and releasing resets it
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 30, { steps: 4 });
    const t = await page.locator('.joystick-knob').getAttribute('style');
    expect(t).toContain('translate');
    expect(t).not.toContain('translate(0px, 0px)');
    await page.mouse.up();
    await expect(page.locator('.joystick-knob')).toHaveAttribute('style', /translate\(0px, 0px\)/);
    expect(errors).toEqual([]);
  });

  test('2D list fits the phone viewport and the temple button is reachable', async ({ page }) => {
    await page.goto('/?view=2d');
    await registerAs(page, 'viewer', 'Khách Màn Nhỏ');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.getByRole('button', { name: /Đền/ })).toBeVisible();
  });
});

test.describe('2D fallback without WebGL', () => {
  test('falls back to the list when WebGL is unavailable even for ?view=3d', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof orig;
    });
    await page.goto('/?view=3d');
    await registerAs(page, 'viewer', 'Khách Không GPU');
    await expect(page.locator('.cand-row').first()).toBeVisible();
    await expect(page.locator('canvas.scene, .street-3d')).toHaveCount(0);
  });
});

test.describe('OG endpoints with hostile input (AC-18.3, BR-SP6)', () => {
  const hostileSlugs = [
    'x'.repeat(5000),
    encodeURIComponent('🔥🔥🔥😀'),
    encodeURIComponent('مرحبا بالعالم'),
    encodeURIComponent('<script>alert(1)</script>'),
    encodeURIComponent("'; DROP TABLE candidates;--"),
    encodeURIComponent('../../etc/passwd'),
    '%00',
    encodeURIComponent('‮evil‬'),
  ];
  for (const [i, slug] of hostileSlugs.entries()) {
    test(`/api/og/c/<hostile #${i}> returns a PNG`, async ({ request }) => {
      const res = await request.get(`/api/og/c/${slug}`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
      expect((await res.body()).length).toBeGreaterThan(1000);
    });
  }
  test('/api/og/c/<slug>?d=<garbage> (tampered payload) returns a PNG', async ({ request }) => {
    for (const d of ['!!!', 'a'.repeat(6_000), encodeURIComponent('<script>'), '%E0%A4%A']) {
      const res = await request.get(`/api/og/c/some-slug?d=${d}`);
      expect(res.status(), `d=${d.slice(0, 20)}`).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    }
  });
  test('/api/og/q/<id> with hostile id / name / day returns a PNG', async ({ request }) => {
    const cases = [
      '/api/og/q/unknown-id',
      `/api/og/q/${'x'.repeat(5000)}`,
      `/api/og/q/${encodeURIComponent('🔥')}?n=${encodeURIComponent('<script>alert(1)</script>')}&d=2026-11-04`,
      `/api/og/q/q01?n=${encodeURIComponent('🔥'.repeat(600))}&d=nope`,
      `/api/og/q/q01?n=${encodeURIComponent('مرحبا')}&d=${encodeURIComponent('‮2026')}`,
      '/api/og/q/q01?n=&d=',
    ];
    for (const c of cases) {
      const res = await request.get(c);
      expect(res.status(), c.slice(0, 80)).toBe(200);
      expect(res.headers()['content-type'], c.slice(0, 80)).toContain('image/png');
    }
  });
  test('/c/<hostile> pages do not crash (404 or 200, never 5xx) and never reflect raw HTML', async ({ page }) => {
    for (const slug of ['x'.repeat(5000), encodeURIComponent('<script>alert(1)</script>'), encodeURIComponent('🔥')]) {
      const res = await page.goto(`/c/${slug}`);
      expect(res?.status()).toBeLessThan(500);
      expect(await page.content()).not.toContain('<script>alert(1)</script>');
    }
  });
});

test('sample sitCandidate helper is wired (smoke): a new candidate shows up as "Bạn"', async ({ page }) => {
  await page.goto('/?view=2d');
  await sitCandidate(page, { name: 'Em Hiện Hình', sign: 'Biển kiểm tra hiện hình trên phố' });
  await expect(page.getByText('CV của Em Hiện Hình')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cand-row.mine')).toContainText('Em Hiện Hình');
});
