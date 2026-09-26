// QA: бір файлдық нұсқаны file:// арқылы, желісіз ашып тексеру.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const [file, shot] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, offline: true });
const page = await ctx.newPage();
const errors = [], requests = [];
page.on('request', (r) => !r.url().startsWith('data:') && !r.url().startsWith('file:') && requests.push(r.url()));
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('file://' + resolve(file));
await page.waitForTimeout(2000);
const info = await page.evaluate(() => ({
  images: [...document.images].map((i) => i.naturalWidth > 0),
  font: document.fonts.check('900 96px Nunito', 'ҚАЙЛАР'),
}));
console.log('images loaded:', info.images.every(Boolean), info.images.length, '| Nunito:', info.font);
await page.screenshot({ path: shot });
await page.getByTestId('start').click();
await page.waitForTimeout(600);
console.log('start → screen 2:', (await page.locator('text=Саяхатшының сөмкесі').count()) > 0);
// all 16 screens: «Келесі» арқылы соңына дейін
let broken = 0;
for (let n = 2; n <= 16; n++) {
  broken += await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length);
  if (n < 16) { await page.getByText('Келесі').last().click(); await page.waitForTimeout(900); }
}
const last = Number(await page.locator('[data-screen]').last().getAttribute('data-screen'));
console.log('offline walkthrough reached screen:', last, '| broken images:', broken);
console.log('external requests:', requests.length ? requests : 'none');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
