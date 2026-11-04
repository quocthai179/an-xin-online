import type { Page } from '@playwright/test';

/** Collects page errors and console errors so specs can assert the app stayed clean. */
export function collectErrors(page: Page, label: string, sink: string[]): void {
  page.on('pageerror', (e) => sink.push(`${label} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') sink.push(`${label} console: ${m.text()}`);
  });
}

export async function registerViewer(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder(/^Ví dụ/).fill(name);
  await page.getByText('Khách qua đường').click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Vào phố' }).click();
}

export async function registerHr(page: Page, name: string, company = 'ACME'): Promise<void> {
  await page.getByPlaceholder(/^Ví dụ/).fill(name);
  await page.getByText('HR / Nhà tuyển dụng').click();
  await page.locator('label:has-text("Công ty") input').fill(company);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Vào phố' }).click();
  await page.locator('.hud').waitFor();
}

export async function registerAs(page: Page, kind: 'candidate' | 'viewer', name: string): Promise<void> {
  await page.getByPlaceholder(/^Ví dụ/).fill(name);
  if (kind === 'viewer') await page.getByText('Khách qua đường').click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Vào phố' }).click();
  await page.locator('.hud').waitFor();
}

/** Registers a candidate and sits them down in `zone` (2D view). Returns once the CV panel is open. */
export async function sitCandidate(
  page: Page,
  opts: { name: string; sign: string; contact?: string; zoneLabel?: string },
): Promise<void> {
  await registerAs(page, 'candidate', opts.name);
  await page.getByRole('button', { name: /Ra ngồi/ }).click();
  const form = page.locator('.cand-form');
  await form.locator('textarea').first().fill(opts.sign);
  if (opts.zoneLabel) await form.locator('select').first().selectOption({ label: opts.zoneLabel });
  await form.locator('input').first().fill('Backend Dev');
  await form.locator('input[inputmode=numeric]').first().fill('3');
  await form.locator('label:has-text("Kỹ năng") input').fill('Java, Go');
  await form.locator('label:has-text("Giá trị liên hệ") input').fill(opts.contact ?? 'dev@example.com');
  await form.getByRole('checkbox', { name: /đồng ý hiển thị/ }).check();
  await form.getByRole('button', { name: 'Ra ngồi' }).click();
}

/** Opens a candidate's CV from the 2D list by a snippet of the sign text. */
export async function openCv(page: Page, signSnippet: string, zoneShort?: RegExp): Promise<void> {
  if (zoneShort) await page.getByRole('button', { name: zoneShort }).first().click();
  await page.locator('.cand-row', { hasText: signSnippet }).first().click();
}
