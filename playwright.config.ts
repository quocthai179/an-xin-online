import { defineConfig, devices } from '@playwright/test';

// Chromium comes preinstalled (PLAYWRIGHT_BROWSERS_PATH); never run `playwright install` here.
// E2E_BASE_URL reuses an already running server; E2E_SKIP_BUILD=1 reuses an existing `.next` build.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const start = `pnpm start -p ${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // software WebGL so the 3D smoke test works on machines without a GPU
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.E2E_SKIP_BUILD === '1' ? start : `pnpm build && ${start}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { NEXT_PUBLIC_FORCE_DEMO: '1' },
      },
});
