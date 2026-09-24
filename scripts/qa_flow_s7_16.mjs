// QA: SCREEN 7–16.
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
  const score = async () => (await page.getByTestId('score').innerText()).replace(/\s+/g, ' ');
  const tc = async (id) => (await page.getByTestId(id).textContent()).replace(/\s+/g, ' ').trim();
  const st = async (id) => page.getByTestId(id).getAttribute('data-state');
  const stage = async () => (await page.locator('[data-stage]').textContent()).replace(/\s+/g, ' ');
  const open = async (n, extra = {}) => {
    await page.goto('http://localhost:4173/');
    await page.evaluate(([n, extra]) => localStorage.setItem('sayakhatshy-balakaylar:v1', JSON.stringify({ screen: n, ...extra })), [n, extra]);
    await page.reload(); await page.waitForTimeout(1300);
  };
  const teacher = async () => { await page.keyboard.press('Shift+T'); await page.waitForTimeout(400); };
  const closeTeacher = async () => { await page.getByText('Жабу', { exact: true }).first().click(); await page.waitForTimeout(400); };

  // 7
  await open(7);
  const s7 = await stage();
  check('7: мұғалім сөзі (3 сөйлем)', ['Балалар, біз Бурабайға келдік.', 'Бурабайдың табиғаты өте әдемі.', 'Мұнда көл, тау, орман бар.'].every((l) => s7.includes(l)));
  const it = async (id) => (await page.getByTestId(id).innerText()).replace(/\s+/g, ' ').trim();
  check('7: 5 жаңа сөз аудармасымен', (await it('word-тау')) === 'тау гора' && (await it('word-табиғат')) === 'табиғат природа' && (await page.locator('[data-testid^="word-"]').count()) === 5);

  // 8
  await open(8);
  check('8: тапсырма мәтіні', (await stage()).includes('Суретке қарап жауап бер: «Не көріп тұрсың?»'));
  await page.getByTestId('spot-көл').click(); await page.getByTestId('spot-тау').click(); await page.waitForTimeout(500);
  check('8: суреттен көл мен тау табылды', (await st('spot-көл')) === 'found' && (await st('spot-тау')) === 'found' && (await st('spot-орман')) === 'hidden');
  await page.getByTestId('found-көл').click(); await page.waitForTimeout(500);
  check(`8: сөйлем «${await tc('sentence')}»`, (await tc('sentence')) === 'Мен көл көріп тұрмын.');
  check('8: үлгі жабық, балл 0', (await page.getByTestId('example').count()) === 0 && (await score()) === '0 / 10');
  await page.screenshot({ path: `${out}/s8-done-${vw}.png` });
  await teacher();
  await page.getByText('Үлгіні көрсету').click();
  for (let i = 0; i < 3; i++) { await page.getByTestId('score-seeing-objects-1').click(); await page.getByTestId('score-seeing-sentence-1').click(); }
  await page.waitForTimeout(400);
  check(`8: мұғалім 2 балл → ${await score()}`, (await score()) === '2 / 10' && (await tc('example')) === 'Үлгі: «Мен көл көріп тұрмын. Мен тау көріп тұрмын. Бурабайдың табиғаты әдемі.»');

  // 9
  await open(9);
  check('9: 12 сөз Word ретімен', JSON.stringify(await page.locator('[data-testid^="odd-"][data-state]').evaluateAll((e) => e.map((x) => x.textContent))) === JSON.stringify(['көл', 'тау', 'орман', 'мектеп', 'ағаш', 'гүл', 'шөп', 'дәптер', 'әдемі', 'таза', 'көрікті', 'жазады']));
  await page.getByTestId('odd-0-мектеп').click(); await page.getByTestId('odd-0-тау').click(); await page.getByTestId('odd-1-дәптер').click(); await page.waitForTimeout(300);
  check('9: әр жолда бір ғана таңдау', (await st('odd-0-тау')) === 'picked' && (await st('odd-0-мектеп')) === 'idle' && (await st('odd-1-дәптер')) === 'picked');
  await teacher();
  for (let i = 0; i < 4; i++) await page.getByTestId('score-oddWord-found-1').click();
  await page.waitForTimeout(300);
  check(`9: мұғалім 1 балл (max 1) → ${await score()}`, (await score()) === '1 / 10');

  // 10
  await open(10);
  check('10: 4 қимыл Word-тағыдай', (await stage()).includes('Бурабайдың тауына шығамыз — қолымызды жоғары көтереміз!') && (await stage()).includes('Құстар болып ұшамыз!'));
  await page.getByTestId('move-lake').click(); await page.waitForTimeout(700);
  check('10: көл қимылы белсенді', (await st('move-lake')) === 'active' && (await st('move-mountain')) === 'idle');
  await page.screenshot({ path: `${out}/s10-active-${vw}.png` });
  await teacher();
  check('10: балл бөлімі жоқ', (await page.getByTestId('teacher-scoring').count()) === 0);

  // 11
  await open(11);
  const s11 = await stage();
  check('11: мұғалім сөзі + Медеу, Көктөбе, тау', ['Соңғы бағытымыз — Алматы қаласы.', 'Алматы — үлкен әрі әдемі қала.'].every((l) => s11.includes(l)) && (await page.locator('[data-testid^="place-"]').count()) === 3);

  // 12
  await open(12);
  check('12: «Тексеру» бастапқыда белсенді емес', await page.getByTestId('check').isDisabled());
  const picks = [true, true, true, true, false]; // 3-мәлімдемеге қасақана қате жауап
  for (let i = 0; i < 5; i++) await page.getByTestId(`tf-${i}-${picks[i]}`).click();
  await page.getByTestId('check').click(); await page.waitForTimeout(700);
  const rows = await Promise.all([0, 1, 2, 3, 4].map((i) => st(`tf-row-${i}`)));
  check(`12: тексеру Word жауаптарымен: ${rows}`, JSON.stringify(rows) === JSON.stringify(['correct', 'correct', 'wrong', 'correct', 'correct']));
  await page.getByTestId('tf-2-false').click({ force: true }); await page.waitForTimeout(300);
  check('12: тексерілген соң жауап өзгермейді, «Тексеру» жоқ', (await page.getByTestId('tf-2-true').getAttribute('aria-pressed')) === 'true' && (await st('tf-row-2')) === 'wrong' && (await page.getByTestId('check').count()) === 0);
  check('12: тексеру балл қоспайды', (await score()) === '0 / 10');
  await page.screenshot({ path: `${out}/s12-checked-${vw}.png` });
  await teacher();
  for (const v of [2, 2, 1]) await page.getByTestId(`score-trueFalse-distinguish-${v}`).click();
  await page.waitForTimeout(300);
  check(`12: мұғалім 0/1/2 → соңғысы 1 → ${await score()}`, (await score()) === '1 / 10');

  // 13
  await open(13);
  await page.getByTestId('support-Алматы').click(); await page.getByTestId('support-әдемі').click();
  await page.getByTestId('line-1').click(); await page.getByTestId('line-1').type('Алматыда');
  await page.getByTestId('support-Медеу').click(); await page.getByTestId('support-бар').click();
  check(`13: тірек сөздер жолға қосылады: "${await page.getByTestId('line-0').inputValue()}" | "${await page.getByTestId('line-1').inputValue()}"`, (await page.getByTestId('line-0').inputValue()) === 'Алматы әдемі' && (await page.getByTestId('line-1').inputValue()) === 'Алматыда Медеу бар');
  check('13: үлгі жабық', (await page.getByTestId('example').count()) === 0);
  await page.getByTestId('line-2').click();
  await page.keyboard.press('Shift+T'); await page.waitForTimeout(300);
  check(`13: инпутта Shift+T мұғалім панелін ашпайды, әріп жазылады ("${await page.getByTestId('line-2').inputValue()}")`, (await page.getByTestId('teacher-panel').count()) === 0 && (await page.getByTestId('line-2').inputValue()) === 'T');

  // 14
  await open(14);
  await page.getByTestId('ticket-6').click(); await page.waitForTimeout(1300);
  check(`14: билет ашылды, сұрақ Word-тағыдай: «${await tc('ticket-question')}»`, (await tc('ticket-question')) === 'Астанада қандай көрікті жер бар?');
  await page.screenshot({ path: `${out}/s14-open-${vw}.png` });
  await page.getByTestId('ticket-answered').click(); await page.waitForTimeout(700);
  check('14: билет орындалды деп белгіленді', (await st('ticket-6')) === 'done' && (await page.getByTestId('ticket-open').count()) === 0);
  await page.getByTestId('ticket-0').click(); await page.waitForTimeout(1200);
  check('14: 1-билет → 1-сұрақ', (await tc('ticket-question')) === 'Қазақстанның астанасы қай қала?');
  await page.getByTestId('ticket-answered').click(); await page.waitForTimeout(600);
  await teacher();
  for (let i = 0; i < 5; i++) await page.getByTestId('score-ticket-answered-1').click();
  await page.waitForTimeout(300);
  check(`14: бірнеше билет ашылса да max 1 балл → ${await score()}`, (await score()) === '1 / 10');

  // 15
  await open(15);
  await page.getByTestId('choice-Бурабай').click();
  await page.getByTestId('reflection-input-1').fill('қазақ тілін');
  check('15: 1-сөйлем таңдаумен, 2-сөйлем жазумен', (await page.getByTestId('reflection-input-0').inputValue()) === 'Бурабай' && (await page.getByTestId('reflection-input-1').inputValue()) === 'қазақ тілін');
  const s15 = await stage();
  check('15: Word сөйлемдері', s15.includes('Маған') && s15.includes('ұнады.') && s15.includes('білдім.') && s15.includes('көргім келеді.') && s15.includes('Сөйлемдерді аяқта:'));

  // 16 — балл орталық state-тен
  await open(16, { scores: { 'bag.named': 1, 'bag.sentence': 1, 'recognize.named': 1, 'seeing.objects': 1, 'trueFalse.distinguish': 2, 'ticket.answered': 1 } });
  check(`16: жинаған балл орталық state-тен → «${await tc('final-score')}»`, (await tc('final-score')) === '7 / 10' && (await score()) === '7 / 10');
  await page.getByTestId('student-name').fill('Айгерім');
  await page.getByTestId('favorite-Алматы').click(); await page.waitForTimeout(300);
  const s16 = await tc('traveler-ticket');
  check('16: билет мазмұны Word-тағыдай', ['САЯХАТШЫ БИЛЕТІ', 'Қазақстан бойынша виртуалды саяхат', 'Оқушының аты', 'Астана → Бурабай → Алматы', 'Жинаған балл', 'Менің сүйікті бағытым'].every((x) => s16.includes(x)));
  check('16: аты мен сүйікті бағыт', (await page.getByTestId('student-name').inputValue()) === 'Айгерім' && (await page.getByTestId('favorite-Алматы').getAttribute('aria-pressed')) === 'true');
  check('16: соңғы экранда «Келесі» жоқ', (await page.getByText('Келесі').count()) === 0);
  await page.screenshot({ path: `${out}/s16-final-${vw}.png` });

  check(`console/page errors: ${errors.length ? errors : 'none'}`, errors.length === 0);
  await page.close();
}
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
