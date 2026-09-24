// Әр интерактивті экранда: әрекет жасау → бетті жаңарту → ештеңе сақталмағанын тексеру.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const results = [];
const check = (name, ok) => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', name); };
const open = async (n) => { await page.goto(`http://localhost:4173/#s${n}`); await page.reload(); await page.waitForTimeout(1200); };
const selected = () => page.locator('[data-state="in-bag"],[data-state="wrong"],[data-state="reached"],[data-state="matched"],[data-state="correct"],[data-state="found"],[data-state="picked"],[data-state="active"],[data-state="done"],[aria-pressed="true"]').count();
const inputs = () => page.locator('input').evaluateAll((els) => els.map((e) => e.value).join(''));
const cases = [
  [2, async () => { await page.getByTestId('item-карта').click(); await page.getByTestId('item-доп').click(); }],
  [3, async () => { await page.getByTestId('stop-0').click(); }],
  [5, async () => { await page.getByTestId('name-Бәйтерек').click(); await page.getByTestId('pic-0').click(); }],
  [6, async () => { for (const w of ['Астана', 'әдемі', 'қала']) await page.getByTestId(`word-0-${w}`).click(); await page.getByTestId('check').click(); }],
  [8, async () => { await page.getByTestId('spot-көл').click(); }],
  [9, async () => { await page.getByTestId('odd-0-мектеп').click(); }],
  [10, async () => { await page.getByTestId('move-lake').click(); }],
  [12, async () => { await page.getByTestId('tf-0-true').click(); }],
  [13, async () => { await page.getByTestId('support-Алматы').click(); }],
  [14, async () => { await page.getByTestId('ticket-0').click(); await page.waitForTimeout(1200); await page.getByTestId('ticket-answered').click(); }],
  [15, async () => { await page.getByTestId('choice-Бурабай').click(); }],
  [16, async () => { await page.getByTestId('student-name').fill('Айгерім'); await page.getByTestId('favorite-Алматы').click(); }],
];
for (const [n, act] of cases) {
  await open(n);
  await act(); await page.waitForTimeout(900);
  const before = (await selected()) + (await inputs()).length;
  await page.reload(); await page.waitForTimeout(1300);
  const after = (await selected()) + (await inputs()).length;
  check(`${n}-экран: әрекеттен кейін ${before} белгі → жаңартудан кейін ${after}`, before > 0 && after === 0);
}
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
