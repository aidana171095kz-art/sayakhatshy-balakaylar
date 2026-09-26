// Мұғалімсіз: оқушы барлық тапсырманы дұрыс орындаса — бағалау парағы бойынша 10/10 жиналады.
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const results = [];
const check = (name, ok) => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', name); };
const total = async () => Number(await page.getByTestId('score').getAttribute('data-total'));
const next = async () => { await page.getByText('Келесі').last().click(); await page.waitForTimeout(900); };
await page.goto('http://localhost:4173/'); await page.reload(); await page.waitForTimeout(1300);
await page.getByTestId('start').click(); await page.waitForTimeout(900);
// 2 — сөмке (2)
await page.getByTestId('item-карта').click(); await page.waitForTimeout(800); await page.getByTestId('bag-карта').click(); await page.waitForTimeout(400);
check(`Саяхатшының сөмкесі → ${await total()}/2`, (await total()) === 2);
await next(); await next(); await next(); // 3, 4 → 5
// 5 — суретті таны (2)
for (const [n, i] of [['Бәйтерек', 0], ['Ақорда', 1], ['Хан Шатыр', 2]]) { await page.getByTestId(`name-${n}`).click(); await page.getByTestId(`pic-${i}`).click(); await page.waitForTimeout(300); }
for (const [q, a] of [[0, 'Бәйтерек'], [1, 'Астана'], [2, 'әдемі']]) await page.getByTestId(`answer-${q}-${a}`).click();
await page.waitForTimeout(500);
check(`Астана: Суретті таны → ${(await total()) - 2}/2`, (await total()) === 4);
await next(); await next(); await next(); // 6, 7 → 8
// 8 — не көріп тұрсың (2)
await page.getByTestId('spot-көл').click(); await page.getByTestId('spot-тау').click(); await page.waitForTimeout(400); await page.getByTestId('found-көл').click(); await page.waitForTimeout(400);
check(`Бурабай: Не көріп тұрсың? → ${(await total()) - 4}/2`, (await total()) === 6);
await next();
// 9 — артық сөз (1)
for (const [r, w] of [[0, 'мектеп'], [1, 'дәптер'], [2, 'жазады']]) await page.getByTestId(`odd-${r}-${w}`).click();
await page.waitForTimeout(400);
check(`Артық сөзді тап → ${(await total()) - 6}/1`, (await total()) === 7);
await next(); await next(); await next(); // 10, 11 → 12
// 12 — дұрыс/бұрыс (2)
for (const [i, v] of [[0, true], [1, true], [2, false], [3, true], [4, false]]) await page.getByTestId(`tf-${i}-${v}`).click();
await page.getByTestId('check').click(); await page.waitForTimeout(600);
check(`Алматы: Дұрыс/бұрыс → ${(await total()) - 7}/2`, (await total()) === 9);
await next(); await next(); // 13 → 14
// 14 — сиқырлы билет (1)
await page.getByTestId('ticket-3').click(); await page.waitForTimeout(1200); await page.getByTestId('ticket-answered').click(); await page.waitForTimeout(600);
check(`Сиқырлы билет → ${(await total()) - 9}/1`, (await total()) === 10);
await next(); await next(); // 15 → 16
check(`Саяхатшы билеті: ${(await page.getByTestId('final-score').textContent()).replace(/\s+/g, ' ').trim()}`, (await page.getByTestId('final-score').textContent()).replace(/\s+/g, ' ').trim() === '10 / 10');
await page.getByTestId('open-sheet').click(); await page.waitForTimeout(600);
check(`БАҒАЛАУ ПАРАҒЫ «Барлығы»: ${(await page.getByTestId('sheet-total').textContent()).trim()}`, (await page.getByTestId('sheet-total').textContent()).trim() === '10');
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
