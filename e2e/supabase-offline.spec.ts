import { expect, test } from '@playwright/test';
import { collectErrors } from './helpers';

// Needs a build with an unreachable Supabase project:
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x pnpm build
//   E2E_SUPABASE_OFFLINE=1 E2E_SKIP_BUILD=1 pnpm test:e2e e2e/supabase-offline.spec.ts
// (the default `pnpm test:e2e` forces demo mode and skips this file)
test.skip(process.env.E2E_SUPABASE_OFFLINE !== '1', 'needs a build pointing at an unreachable Supabase');

test('unreachable Supabase: no white screen, offline banner, onboarding still usable', async ({ page }) => {
  const errors: string[] = [];
  collectErrors(page, 'offline', errors);
  await page.goto('/?view=2d');
  await expect(page.getByRole('button', { name: 'Vào phố' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Mất kết nối' })).toBeVisible();

  await page.getByPlaceholder(/^Ví dụ/).fill('Khách Mất Mạng');
  await page.getByText('Khách qua đường').click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Vào phố' }).click();
  await expect(page.getByText('Mạng lag, thử lại nhé.')).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();
});

test('unreachable Supabase: share page falls back to the samples, CSP allows only the configured host', async ({ page, request }) => {
  const res = await page.goto('/c/mau-backend-1');
  expect(res?.status()).toBe(200);
  const csp = (await request.get('/')).headers()['content-security-policy'];
  expect(csp).toContain('http://127.0.0.1:9');
  expect(csp).toContain('ws://127.0.0.1:9');
  expect(csp).not.toContain('supabase.co');
  const admin = await request.get('/api/admin/moderate');
  expect(admin.status()).toBe(503);
});
