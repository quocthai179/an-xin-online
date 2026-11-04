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
