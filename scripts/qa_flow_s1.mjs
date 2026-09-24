// QA: Screen 1 flow + Teacher Mode scoring through the real UI.
import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
page.on('pageerror', (e) => errors.push(e.message));
const check = (name, ok) => console.log(ok ? 'PASS' : 'FAIL', name);
const score = async () => (await page.getByTestId('score').innerText()).replace(/\s+/g, ' ');

await page.goto('http://localhost:4173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(1200);
await page.getByTestId('start').click();
await page.waitForTimeout(600);
check('Саяхатты бастау → экран 2', (await page.locator('text=Саяхатшының сөмкесі').count()) > 0);

for (let i = 0; i < 3; i++) await page.getByTestId('teacher-trigger').click();
await page.waitForTimeout(500);
check('3 рет басу → мұғалім панелі', await page.getByTestId('teacher-panel').isVisible());

for (let i = 0; i < 5; i++) await page.getByTestId('score-bag-named-1').click();
await page.getByTestId('score-bag-sentence-1').click();
await page.waitForTimeout(700);
check(`балл 2/10 (қайталап басу балл қоспайды) → "${await score()}"`, (await score()) === '2 / 10');
check('панель жиыны 2 / 10', (await page.getByTestId('teacher-total').innerText()) === '2 / 10');
await page.screenshot({ path: `${out}/s2-teacher.png` });

await page.reload();
await page.waitForTimeout(800);
check(`бетті жаңартқанда сақталады → "${await score()}"`, (await score()) === '2 / 10');

await page.keyboard.press('Shift+T');
await page.waitForTimeout(500);
check('Shift+T → мұғалім панелі', await page.getByTestId('teacher-panel').isVisible());
await page.getByText('Тапсырманы reset').click();
await page.waitForTimeout(300);
check(`тапсырманы reset → "${await score()}"`, (await score()) === '0 / 10');

await page.getByTestId('score-bag-named-1').click();
await page.getByText('Толық reset').click();
await page.getByText('Растау: бәрін өшіру').click();
await page.waitForTimeout(700);
check('толық reset → Welcome экраны', await page.getByTestId('start').isVisible());

console.log('HTTP/page errors:', errors.length ? errors : 'none');
await browser.close();
