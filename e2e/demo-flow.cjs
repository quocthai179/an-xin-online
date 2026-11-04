const { chromium } = require('playwright');
const OUT = process.env.OUT_DIR || require('os').tmpdir();
const BASE = process.env.BASE_URL || 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const errors = [];
  const hr = await ctx.newPage();
  hr.on('pageerror', (e) => errors.push('hr pageerror ' + e.message));
  hr.on('console', (m) => { if (m.type() === 'error') errors.push('hr console ' + m.text()); });
  await hr.goto(BASE);
  await hr.waitForSelector('text=Vào phố');
  await hr.fill('input[placeholder^="Ví dụ"]', 'Chị Lan HR');
  await hr.getByText('HR / Nhà tuyển dụng').click();
  await hr.locator('label:has-text("Công ty") input').fill('ACME');
  await hr.getByRole('checkbox').check();
  await hr.getByRole('button', { name: 'Vào phố' }).click();
  await hr.waitForSelector('.hud');
  console.log('hr registered, uid', await hr.evaluate(() => window.__pxv.uid));

  const cand = await ctx.newPage();
  cand.on('pageerror', (e) => errors.push('cand pageerror ' + e.message));
  cand.on('console', (m) => { if (m.type() === 'error') errors.push('cand console ' + m.text()); });
  await cand.goto(BASE);
  await cand.waitForSelector('text=Vào phố');
  console.log('cand uid', await cand.evaluate(() => window.__pxv.uid));
  await cand.fill('input[placeholder^="Ví dụ"]', 'Em Dev Muộn');
  await cand.getByRole('checkbox').check();
  await cand.getByRole('button', { name: 'Vào phố' }).click();
  await cand.waitForSelector('.hud');
  await cand.getByRole('button', { name: /Ra ngồi/ }).click();
  await cand.fill('.cand-form textarea >> nth=0', 'Test sign: xin việc remote, nhà còn mẹ già');
  await cand.fill('.cand-form input >> nth=0', 'Backend Dev');
  await cand.locator('.cand-form input[inputmode=numeric]').first().fill('3');
  await cand.locator('.cand-form label:has-text("Kỹ năng") input').fill('Java, Go');
  await cand.locator('.cand-form label:has-text("Giá trị liên hệ") input').fill('dev@example.com');
  await cand.locator('.cand-form').getByRole('checkbox', { name: /đồng ý hiển thị/ }).check();
  await cand.screenshot({ path: OUT + '/cand-form.png' });
  await cand.locator('.cand-form').getByRole('button', { name: 'Ra ngồi' }).click();
  await cand.waitForSelector('text=CV của Em Dev Muộn');
  await cand.keyboard.press('Escape');

  // HR sees the candidate in list (backend zone default)
  await hr.getByRole('button', { name: /Backend/ }).first().click();
  await hr.getByText('Test sign: xin việc remote').first().click();
  await hr.waitForSelector('text=CV của Em Dev Muộn');
  await hr.getByRole('button', { name: /Thả xu/ }).click();
  await cand.waitForSelector('.toast:has-text("vừa thả xu cho bạn")', { timeout: 5000 });
  console.log('candidate toast received for xu');
  await cand.screenshot({ path: OUT + '/cand-toast.png' });

  // 500k
  await hr.getByRole('button', { name: /Thả 500k/ }).click();
  await hr.fill('textarea', 'Mời bạn phỏng vấn vị trí Backend nhé');
  await hr.locator('label:has-text("Cách liên hệ") input').fill('lan@acme.vn');
  await hr.getByRole('button', { name: 'Thả 500k' }).click();
  await cand.waitForSelector('.toast.prominent:has-text("500k")', { timeout: 5000 });
  console.log('candidate got 500k toast');
  await cand.getByRole('button', { name: /Xem lời mời/ }).first().click();
  await cand.getByRole('button', { name: 'Nhận lời' }).click();
  await hr.waitForSelector('.toast:has-text("nhận lời")', { timeout: 5000 });
  console.log('hr got accepted toast');

  // bao tron
  await hr.waitForSelector('text=CV của Em Dev Muộn');
  await hr.getByRole('button', { name: /Bao trọn/ }).click();
  await hr.locator('label:has-text("Vị trí") input').fill('Backend Dev');
  await hr.locator('label:has-text("Mức lương") input').fill('30 triệu');
  await hr.getByRole('button', { name: 'Gửi offer' }).click();
  await cand.waitForSelector('.toast.prominent:has-text("bao trọn")', { timeout: 5000 });
  await cand.getByRole('button', { name: /Xem lời mời/ }).first().click();
  await cand.getByRole('button', { name: 'Chấp nhận' }).click();
  await hr.waitForSelector('.toast:has-text("vừa được bao")', { timeout: 5000 });
  await cand.keyboard.press('Escape');
  await cand.getByRole('button', { name: /Hồ sơ của tôi/ }).click();
  await cand.waitForSelector('text=ĐÃ ĐƯỢC BAO');
  console.log('placed shown');
  await cand.screenshot({ path: OUT + '/cand-placed.png' });
  await hr.screenshot({ path: OUT + '/hr.png' });

  // mobile screenshot of list
  const m = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const mp = await m.newPage();
  await mp.goto(BASE + '?as=mobile');
  await mp.waitForSelector('text=Vào phố');
  await mp.fill('input[placeholder^="Ví dụ"]', 'Khách Mobile');
  await mp.getByText('Khách qua đường').click();
  await mp.getByRole('checkbox').check();
  await mp.getByRole('button', { name: 'Vào phố' }).click();
  await mp.waitForSelector('.cand-row');
  await mp.screenshot({ path: OUT + '/mobile.png' });
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
