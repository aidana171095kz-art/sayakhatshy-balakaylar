// QA: SCREEN 3 — Қазақстан картасы (аялдамаларды ретімен басу, маршрут, reset).
import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const results = [];
for (const [vw, vh] of [[1920, 1080], [1024, 768]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const check = (name, ok) => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', `[${vw}]`, name); };
  const states = async () => Promise.all([0, 1, 2].map((i) => page.getByTestId(`stop-${i}`).getAttribute('data-state')));
  const score = async () => `${await page.getByTestId('score').getAttribute('data-total')} / 10`;

  await page.goto('http://localhost:4173/#s3');
  await page.reload(); await page.waitForTimeout(1200);

  check('Word сөйлемі', (await page.getByTestId('route-sentence').innerText()) === 'Біздің бағытымыз: Астана – Бурабай – Алматы.');
  check('аялдама атаулары', JSON.stringify(await Promise.all([0, 1, 2].map(async (i) => (await page.getByTestId(`stop-label-${i}`).innerText()).replace(/\s+/g, ' ')))) === JSON.stringify(['1 Астана', '2 Бурабай', '3 Алматы']));
  check('бастапқы күй: Астана келесі', JSON.stringify(await states()) === '["next","locked","locked"]');
  await page.getByTestId('stop-2').click(); await page.waitForTimeout(500);
  check('ретсіз басу (Алматы) өтпейді', JSON.stringify(await states()) === '["next","locked","locked"]');
  await page.getByTestId('stop-0').click(); await page.waitForTimeout(400);
  check('Астана → белгіленді', JSON.stringify(await states()) === '["reached","next","locked"]');
  await page.getByTestId('stop-1').click(); await page.waitForTimeout(1400);
  await page.screenshot({ path: `${out}/s3-mid-${vw}.png` });
  await page.getByTestId('stop-2').click(); await page.waitForTimeout(1500);
  check('барлық аялдама белгіленді', JSON.stringify(await states()) === '["reached","reached","reached"]');
  await page.getByTestId('stop-2').click(); await page.getByTestId('stop-0').click(); await page.waitForTimeout(300);
  check('қайта басу күйді бұзбайды', JSON.stringify(await states()) === '["reached","reached","reached"]');
  check('бұл экранда балл жоқ', (await score()) === '0 / 10');
  await page.screenshot({ path: `${out}/s3-done-${vw}.png` });

  await page.keyboard.press('Shift+T'); await page.waitForTimeout(400);
  check('Teacher Mode: бұл экранда бағалау бөлімі жоқ', (await page.getByTestId('teacher-scoring').count()) === 0);
  await page.getByText('Тапсырманы reset').click(); await page.waitForTimeout(500);
  check('reset → қайта басынан', JSON.stringify(await states()) === '["next","locked","locked"]');
  check(`console/page errors: ${errors.length ? errors : 'none'}`, errors.length === 0);
  await page.close();
}
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
