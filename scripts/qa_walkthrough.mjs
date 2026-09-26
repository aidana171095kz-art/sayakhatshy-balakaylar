// FINAL ACCEPTANCE TEST — 18 қадам (START → 1 → … → 16 → Teacher Mode → reset → қайта бастау).
import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const results = [];
const check = (name, ok) => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', name); };
const score = async () => `${await page.getByTestId('score').getAttribute('data-total')} / 10`;
const title = async () => (await page.locator('[data-stage] .absolute.inset-x-16.top-8').first().innerText()).split('\n').slice(0, 2).join(' ');
const next = async () => { await page.getByText('Келесі', { exact: false }).last().click(); await page.waitForTimeout(900); };
const teacherOpen = async () => { if (!(await page.getByTestId('teacher-panel').count())) { await page.keyboard.press('Shift+T'); await page.waitForTimeout(450); } };
const teacherClose = async () => { if (await page.getByTestId('teacher-panel').count()) { await page.getByText('Жабу', { exact: true }).first().click(); await page.waitForTimeout(450); } };
const give = async (ids) => { await teacherOpen(); for (const id of ids) await page.getByTestId(id).click(); await page.waitForTimeout(250); await teacherClose(); };
const screenNo = async () => Number(await page.locator('[data-screen]').last().getAttribute('data-screen'));

// 1–2. Start project, Screen 1
// Бұрынғы нұсқаның қалдығы: 2-экран, заттар таңдалған, балл бар — жаңа нұсқа оны көрсетпеуі керек
await page.goto('http://localhost:4173/');
await page.evaluate(() => localStorage.setItem('sayakhatshy-balakaylar:v1', JSON.stringify({ screen: 2, scores: { 'bag.named': 1 }, screenState: { 2: { bag: ['карта', 'су'], sentences: ['карта'], wrong: ['доп'] } } })));
await page.reload(); await page.waitForTimeout(1500);
check('ескі сақталған күй көрсетілмейді, жадтан өшірілді', (await page.getByTestId('start').isVisible()) && (await page.evaluate(() => localStorage.getItem('sayakhatshy-balakaylar:v1'))) === null);
check('1–2. Жоба ашылды, 1-экран (Welcome)', await page.getByTestId('start').isVisible());
await page.getByTestId('start').click(); await page.waitForTimeout(900);

// 3–4. Screen 2 + score
check('→ 2-экран: бірде-бір зат таңдалмаған, балл 0', (await screenNo()) === 2 && (await page.locator('[data-state="in-bag"], [data-state="wrong"]').count()) === 0 && (await score()) === '0 / 10');
for (const w of ['карта', 'су', 'доп']) { await page.getByTestId(`item-${w}`).click(); await page.waitForTimeout(700); }
await page.getByTestId('bag-карта').click();
await give(['score-bag-named-1', 'score-bag-sentence-1', 'score-bag-named-1']);
check(`3–4. 2-экран орындалды, балл ${await score()}`, (await score()) === '2 / 10');
await next();

// 5. Screen 3 route
check('→ 3-экран', (await screenNo()) === 3);
for (const i of [0, 1, 2]) { await page.getByTestId(`stop-${i}`).click(); await page.waitForTimeout(500); }
check('5. 3-экран: маршрут толық', (await page.getByTestId('stop-2').getAttribute('data-state')) === 'reached');
await next();

// 6. Astana: 4, 5, 6
check('→ 4-экран (Астана)', (await screenNo()) === 4);
await next();
check('→ 5-экран', (await screenNo()) === 5);
for (const [n, i] of [['Бәйтерек', 0], ['Ақорда', 1], ['Хан Шатыр', 2]]) { await page.getByTestId(`name-${n}`).click(); await page.getByTestId(`pic-${i}`).click(); await page.waitForTimeout(500); }
await give(['score-recognize-named-1', 'score-recognize-answer-1']);
await next();
check('→ 6-экран', (await screenNo()) === 6);
const order = [['Астана', 'әдемі', 'қала'], ['Астанада', 'Бәйтерек', 'бар'], ['Астана', 'Қазақстанның', 'астанасы']];
for (let r = 0; r < 3; r++) for (const w of order[r]) await page.getByTestId(`word-${r}-${w}`).click();
await page.getByTestId('check').click(); await page.waitForTimeout(800);
check(`6. Астана бөлімі орындалды, балл ${await score()}`, (await page.getByTestId('all-done').count()) === 1 && (await score()) === '4 / 10');
await next();

// 7. Burabay: 7, 8, 9, 10
check('→ 7-экран (Бурабай)', (await screenNo()) === 7);
await next();
await page.getByTestId('spot-тау').click(); await page.getByTestId('spot-орман').click(); await page.waitForTimeout(400);
await page.getByTestId('found-тау').click();
await give(['score-seeing-objects-1', 'score-seeing-sentence-1']);
await next();
check('→ 9-экран', (await screenNo()) === 9);
for (const [r, w] of [[0, 'мектеп'], [1, 'дәптер'], [2, 'жазады']]) await page.getByTestId(`odd-${r}-${w}`).click();
await give(['score-oddWord-found-1']);
await next();
check('→ 10-экран', (await screenNo()) === 10);
await page.getByTestId('move-mountain').click(); await page.waitForTimeout(500);
check(`7. Бурабай бөлімі орындалды, балл ${await score()}`, (await score()) === '7 / 10');
await next();

// 8. Almaty: 11, 12, 13
check('→ 11-экран (Алматы)', (await screenNo()) === 11);
await next();
for (const [i, v] of [[0, true], [1, true], [2, false], [3, true], [4, false]]) await page.getByTestId(`tf-${i}-${v}`).click();
await page.getByTestId('check').click(); await page.waitForTimeout(700);
await page.getByTestId('check').count().then((c) => check('12-экран: «Тексеру» бір рет қана', c === 0));
await give(['score-trueFalse-distinguish-2', 'score-trueFalse-distinguish-2']);
await next();
check('→ 13-экран', (await screenNo()) === 13);
await page.getByTestId('line-0').fill('Алматы — әдемі қала.');
check(`8. Алматы бөлімі орындалды, балл ${await score()}`, (await score()) === '9 / 10');
await next();

// 9. Magic ticket
check('→ 14-экран', (await screenNo()) === 14);
await page.getByTestId('ticket-9').click(); await page.waitForTimeout(1200);
check('9. Сиқырлы билет: 10-сұрақ', (await page.getByTestId('ticket-question').textContent()).trim() === 'Қазақстан туралы бір сөйлем айт.');
await page.getByTestId('ticket-answered').click(); await page.waitForTimeout(600);
await give(['score-ticket-answered-1', 'score-ticket-answered-1']);
await next();

// 10. Reflection
check('→ 15-экран', (await screenNo()) === 15);
await page.getByTestId('choice-Алматы').click();
await page.getByTestId('reflection-input-1').fill('көп жаңа сөз');
await page.getByTestId('reflection-input-2').fill('Медеуді');
check('10. Рефлексия толтырылды', (await page.getByTestId('reflection-input-2').inputValue()) === 'Медеуді');
await next();

// 11–12. Final ticket + final score
check('→ 16-экран', (await screenNo()) === 16);
await page.getByTestId('student-name').fill('Айгерім');
await page.getByTestId('favorite-Бурабай').click();
const fin = (await page.getByTestId('final-score').textContent()).replace(/\s+/g, ' ').trim();
check(`11–12. Саяхатшы билеті: жинаған балл ${fin}`, fin === '10 / 10' && (await score()) === '10 / 10');
await page.screenshot({ path: `${out}/walk-final.png` });

// Duplicate scoring attempt: teacher presses max again on every task
await teacherOpen();
await page.getByTitle('Сиқырлы билет').click(); await page.waitForTimeout(700);
for (let i = 0; i < 5; i++) await page.getByTestId('score-ticket-answered-1').click();
check(`қосымша басулар жалпы балды 10-нан асырмайды → ${await page.getByTestId('teacher-total').innerText()}`, (await page.getByTestId('teacher-total').innerText()) === '10 / 10');

// 13–15. Teacher Mode → reset one task → score change
await page.getByTitle('Дұрыс па, бұрыс па?').click(); await page.waitForTimeout(700);
await page.getByText('Тапсырманы reset').click(); await page.waitForTimeout(700);
check(`13–15. 12-экран reset → балл ${await score()}, жауаптар тазаланды`, (await score()) === '8 / 10' && (await page.getByTestId('tf-row-0').getAttribute('data-state')) === 'empty');
await page.getByTitle('Саяхатшы билеті').click(); await page.waitForTimeout(900);
check(`финалдық билет жаңа балды көрсетеді → ${(await page.getByTestId('final-score').textContent()).replace(/\s+/g, ' ').trim()}`, (await page.getByTestId('final-score').textContent()).replace(/\s+/g, ' ').trim() === '8 / 10');

// 16. Full reset
await page.getByText('Толық reset').click(); await page.getByText('Растау: бәрін өшіру').click(); await page.waitForTimeout(900);
await teacherClose();
check('16. Толық reset → Welcome экраны', await page.getByTestId('start').isVisible());

// 17–18. Restart, re-check main functions
await page.getByTestId('start').click(); await page.waitForTimeout(900);
check(`17. Қайта басталды: 2-экран, балл ${await score()}`, (await screenNo()) === 2 && (await score()) === '0 / 10');
check('18. 2-экранның күйі тазаланған', (await page.locator('[data-state="in-bag"], [data-state="wrong"]').count()) === 0);
await page.getByTestId('item-кітап').click(); await page.waitForTimeout(800);
check('18. интерактив қайта жұмыс істейді', (await page.getByTestId('item-кітап').getAttribute('data-state')) === 'in-bag');
await page.getByRole('button', { name: 'Артқа' }).click(); await page.waitForTimeout(800);
check('18. «Артқа» навигациясы', await page.getByTestId('start').isVisible());
// 18. Бетті жаңарту — таңдаулар мен балл сақталмайды, таза бастау
await page.getByTestId('start').click(); await page.waitForTimeout(900);
await page.getByTestId('item-билет').click(); await page.waitForTimeout(800);
await give(['score-bag-named-1']);
check('жаңартудан бұрын: билет таңдалған, балл 1', (await page.getByTestId('item-билет').getAttribute('data-state')) === 'in-bag' && (await score()) === '1 / 10');
await page.reload(); await page.waitForTimeout(1300);
check('18. жаңарту → Welcome, ештеңе сақталмаған', await page.getByTestId('start').isVisible());
await page.getByTestId('start').click(); await page.waitForTimeout(900);
check(`18. жаңартудан кейін: таңдау жоқ, балл ${await score()}`, (await page.locator('[data-state="in-bag"], [data-state="wrong"]').count()) === 0 && (await score()) === '0 / 10');
check(`console/page errors: ${errors.length ? errors : 'none'}`, errors.length === 0);
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED', `${results.filter(Boolean).length}/${results.length}`);
await browser.close();
