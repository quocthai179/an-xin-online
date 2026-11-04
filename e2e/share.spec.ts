import { expect, test } from '@playwright/test';

const SLUG = 'mau-backend-1';

test('/c/<slug> has Open Graph metadata pointing to a PNG', async ({ page, request }) => {
  const res = await page.goto(`/c/${SLUG}`);
  expect(res?.status()).toBe(200);
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toContain(`/api/og/c/${SLUG}`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /đang ngồi ở Phố Xin Việc/);
  await expect(page.getByRole('link', { name: /Vào phố, tới thẳng chỗ/ })).toBeVisible();

  const img = await request.get(`/api/og/c/${SLUG}`);
  expect(img.status()).toBe(200);
  expect(img.headers()['content-type']).toContain('image/png');
  expect((await img.body()).length).toBeGreaterThan(5_000);
});

test('unknown candidates get the friendly not-found page', async ({ page }) => {
  const res = await page.goto('/c/khong-ton-tai-123');
  expect(res?.status()).toBe(404);
});

test('security headers are present and Supabase is not whitelisted in demo mode', async ({ request }) => {
  const res = await request.get('/');
  const csp = res.headers()['content-security-policy'];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain('supabase');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
});
