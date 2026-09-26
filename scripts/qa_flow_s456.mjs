// QA: SCREEN 4 (Астана), 5 (Суретті таны), 6 (Адасқан сөздер).
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
  const score = async () => `${await page.getByTestId('score').getAttribute('data-total')} / 10`;
  const text = async (id) => (await page.getByTestId(id).innerText()).replace(/\s+/g, ' ').trim();
  const st = async (id) => page.getByTestId(id).getAttribute('data-state');
  const open = async (n) => {
    await page.goto(`http://localhost:4173/#s${n}`);
    await page.reload(); await page.waitForTimeout(1300);
  };
  const drag = async (from, to) => {
    const a = await page.getByTestId(from).boundingBox(); const b = await page.getByTestId(to).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 25, a.y + a.height / 2 + 10, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up(); await page.waitForTimeout(500);
  };
  const teacher = async () => { await page.keyboard.press('Shift+T'); await page.waitForTimeout(400); };

  // ── SCREEN 4 ──
  await open(4);
  const body4 = (await page.locator('[data-stage]').innerText()).replace(/\s+/g, ' ');
  check('4: Word мәтіні', body4.includes('Саяхатымызды Қазақстанның астанасынан бастаймыз.') && body4.includes('Астанада әдемі ғимараттар мен көрікті орындар көп.'));
  check('4: үш көрікті орын', (await page.getByTestId('landmark-Бәйтерек').count()) + (await page.getByTestId('landmark-Ақорда').count()) + (await page.getByTestId('landmark-Хан Шатыр').count()) === 3);
  await page.getByTestId('landmark-Бәйтерек').click();
  await teacher();
  check('4: балл бөлімі жоқ', (await page.getByTestId('teacher-scoring').count()) === 0);

  // ── SCREEN 5 ──
  await open(5);
  const qs = await Promise.all([0, 1, 2].map(async (i) => (await page.getByTestId(`question-${i}`).locator('p').textContent()).replace(/\s+/g, ' ').trim()));
  check(`5: 3 сұрақ Word-тағыдай: ${JSON.stringify(qs)}`, JSON.stringify(qs) === JSON.stringify(['1Бұл не?', '2Бәйтерек қай қалада орналасқан?', '3Астана қандай қала?']));
  check('5: үлгі бастапқыда жабық', (await page.getByTestId('example').count()) === 0);
  await drag('name-Ақорда', 'pic-0');
  check('5: қате (Ақорда → Бәйтерек суреті) → қызыл', (await st('pic-0')) === 'wrong');
  await page.waitForTimeout(1000);
  check('5: қате белгі өтеді, сәйкестенбейді', (await st('pic-0')) === 'idle' && (await page.getByTestId('name-Ақорда').count()) === 1);
  await page.getByTestId('name-Бәйтерек').click(); await page.getByTestId('pic-0').click(); await page.waitForTimeout(500);
  check('5: басу арқылы Бәйтерек → дұрыс', (await st('pic-0')) === 'matched');
  await drag('name-Ақорда', 'pic-1');
  await drag('name-Хан Шатыр', 'pic-2');
  await page.waitForTimeout(900); // атаулардың exit-анимациясы
  check('5: барлығы сәйкестендірілді', (await st('pic-1')) === 'matched' && (await st('pic-2')) === 'matched' && (await page.locator('[data-testid^="name-"]').count()) === 0);
  check(`5: үш сурет дұрыс → автоматты 1 балл → ${await score()}`, (await score()) === '1 / 10');
  await page.screenshot({ path: `${out}/s5-done-${vw}.png` });
  await page.getByTestId('answer-1-Алматы').click(); await page.waitForTimeout(300);
  check('5: қате жауап (Алматы) → қызыл, балл қосылмайды', (await st('answer-1-Алматы')) === 'wrong' && (await score()) === '1 / 10');
  await page.getByTestId('answer-0-Бәйтерек').click(); await page.getByTestId('answer-1-Астана').click(); await page.getByTestId('answer-2-әдемі').click();
  await page.waitForTimeout(600);
  check(`5: үш сұраққа дұрыс жауап → автоматты 2 балл (max 2) → ${await score()}`, (await score()) === '2 / 10' && (await st('answer-2-әдемі')) === 'correct');
  await teacher();
  await page.getByText('Үлгіні көрсету').click(); await page.waitForTimeout(400);
  check('5: мұғалім үлгіні ашады', (await text('example')) === 'Үлгі жауап: «Бұл — Бәйтерек. Бәйтерек Астанада орналасқан. Астана — әдемі қала.»');
  for (let i = 0; i < 3; i++) { await page.getByTestId('score-recognize-named-1').click(); await page.getByTestId('score-recognize-answer-1').click(); }
  await page.waitForTimeout(300);
  check(`5: мұғалім 2 балл, қайталау қоспайды → ${await score()}`, (await score()) === '2 / 10');
  await page.getByText('Тапсырманы reset').click(); await page.waitForTimeout(800);
  check('5: reset', (await score()) === '0 / 10' && (await st('pic-0')) === 'idle' && (await page.locator('[data-testid^="name-"]').count()) === 3);

  // ── SCREEN 6 ──
  await open(6);
  check('6: тапсырма мәтіні', (await page.locator('[data-stage]').innerText()).includes('Сөздерден дұрыс сөйлем құрастыр:'));
  check('6: «Тексеру» бастапқыда белсенді емес', await page.getByTestId('check').isDisabled());
  for (const w of ['қала', 'Астана', 'әдемі']) await page.getByTestId(`word-0-${w}`).click();
  await page.waitForTimeout(300);
  await page.getByTestId('check').click(); await page.waitForTimeout(200);
  check('6: қате рет → қызыл', (await st('row-0')) === 'wrong');
  await page.waitForTimeout(1200);
  check('6: қате сөздер қайтады', (await st('row-0')) === 'idle' && (await page.locator('[data-testid^="word-0-"]').count()) === 3);
  for (const w of ['Астана', 'әдемі', 'қала']) await page.getByTestId(`word-0-${w}`).click();
  await drag('word-1-Астанада', 'slot-1-0'); await drag('word-1-Бәйтерек', 'slot-1-1'); await drag('word-1-бар', 'slot-1-2');
  await page.getByTestId('word-2-Қазақстанның').click(); await page.waitForTimeout(200);
  await page.getByTestId('slot-2-0').click(); await page.waitForTimeout(300);
  check('6: слотты басу сөзді қайтарады', (await page.getByTestId('word-2-Қазақстанның').count()) === 1);
  for (const w of ['Астана', 'Қазақстанның', 'астанасы']) await page.getByTestId(`word-2-${w}`).click();
  await page.waitForTimeout(300);
  await page.getByTestId('check').click(); await page.waitForTimeout(800);
  check('6: үш жол дұрыс', (await st('row-0')) === 'correct' && (await st('row-1')) === 'correct' && (await st('row-2')) === 'correct');
  // textContent — нақты мәтін (innerText inline-flex элементтердің арасына жол үзілімін қосады)
  const sents = await Promise.all([0, 1, 2].map(async (i) => (await page.getByTestId(`sentence-${i}`).textContent()).trim()));
  check(`6: сөйлемдер Word-тағыдай: ${JSON.stringify(sents)}`, JSON.stringify(sents) === JSON.stringify(['Астана — әдемі қала.', 'Астанада Бәйтерек бар.', 'Астана — Қазақстанның астанасы.']));
  check('6: барлығы дұрыс → жұлдыз', (await page.getByTestId('all-done').count()) === 1);
  check('6: балл жоқ', (await score()) === '0 / 10');
  await page.screenshot({ path: `${out}/s6-done-${vw}.png` });
  await teacher();
  await page.getByText('Тапсырманы reset').click(); await page.waitForTimeout(800);
  await page.getByText('Үлгіні көрсету').click(); await page.waitForTimeout(400);
  check('6: reset + мұғалім дұрыс нұсқаны ашады', (await st('row-0')) === 'idle' && (await text('example-2')) === 'Астана — Қазақстанның астанасы.');
  check(`console/page errors: ${errors.length ? errors : 'none'}`, errors.length === 0);
  await page.close();
}
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
