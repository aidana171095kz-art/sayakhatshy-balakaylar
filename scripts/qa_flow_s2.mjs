// QA: SCREEN 2 — Саяхатшының сөмкесі (click, drag-and-drop, сөйлем, үлгі, балл, reset).
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
  const bagWords = async () => page.locator('[data-testid^="bag-"]:not([data-testid="bag-drop"]):not([data-testid="bag-contents"])').evaluateAll((els) => els.map((e) => e.dataset.testid.slice(4)));
  const sentences = async () => page.locator('[data-testid^="sentence-"]:not([data-testid="sentence-slot"])').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const strip = async () => (await page.getByTestId('sentence').innerText()).replace(/\s+/g, ' ').trim();
  const score = async () => (await page.getByTestId('score').innerText()).replace(/\s+/g, ' ');
  const drag = async (from, to) => {
    const a = await page.locator(from).boundingBox(); const b = await page.locator(to).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 30, a.y + a.height / 2 + 10, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up(); await page.waitForTimeout(500);
  };

  await page.goto('http://localhost:4173/#s2');
  await page.reload(); await page.waitForTimeout(1200);

  check('8 зат Word ретімен', JSON.stringify(await page.locator('[data-testid^="item-"]').evaluateAll((e) => e.map((x) => x.dataset.testid.slice(5)))) === JSON.stringify(['карта','кітап','билет','доп','қалам','төлқұжат','балмұздақ','су']));
  check('үлгі жауап бастапқыда жабық', (await page.getByTestId('example').count()) === 0);

  await page.getByTestId('item-карта').click();
  await page.waitForTimeout(150);
  check('басу → карта сөмкеге ұшады (flight анимациясы бар)', (await page.getByTestId('flight').count()) === 1);
  await page.waitForTimeout(800);
  check('ұшу аяқталды, flight жоғалды', (await page.getByTestId('flight').count()) === 0);
  check('басу → карта сөмкеде, белгісі жасыл', JSON.stringify(await bagWords()) === '["карта"]' && (await page.getByTestId('item-карта').getAttribute('data-state')) === 'in-bag');
  await page.getByTestId('item-доп').click(); await page.waitForTimeout(600);
  check('доп → қызыл (қате), сөмкеге түспейді', (await page.getByTestId('item-доп').getAttribute('data-state')) === 'wrong' && !(await bagWords()).includes('доп'));
  await drag('[data-testid="item-балмұздақ"]', '[data-testid="bag-drop"]');
  check('балмұздақты рюкзакқа сүйреу → қызыл (қате), сөмкеге түспейді', (await page.getByTestId('item-балмұздақ').getAttribute('data-state')) === 'wrong' && !(await bagWords()).includes('балмұздақ'));
  await page.screenshot({ path: `${out}/s2-wrong-${vw}.png` });
  for (let i = 0; i < 3; i++) await page.getByTestId('item-доп').click();
  await page.waitForTimeout(600);
  check('қате затты қайта басу да сөмкеге салмайды', !(await bagWords()).includes('доп'));
  await drag('[data-testid="item-су"]', '[data-testid="bag-drop"]');
  await page.waitForTimeout(500);
  check('сүйреу → су сөмкеде', JSON.stringify(await bagWords()) === '["карта","су"]');
  await drag('[data-testid="item-кітап"]', '[data-testid="sentence-slot"]');
  check('рюкзактан тыс жерге сүйреу → сөмкеге түспейді', !(await bagWords()).includes('кітап'));
  for (let i = 0; i < 4; i++) await page.getByTestId('item-карта').click();
  await page.waitForTimeout(300);
  const afterToggle = await bagWords();
  check(`қайта басу қайталанбайды/алып шығады → ${JSON.stringify(afterToggle)}`, afterToggle.filter((w) => w === 'карта').length <= 1);
  if (!afterToggle.includes('карта')) { await page.getByTestId('item-карта').click(); await page.waitForTimeout(300); }

  await page.getByTestId('bag-карта').click(); await page.waitForTimeout(400);
  await drag('[data-testid="bag-су"]', '[data-testid="sentence-slot"]');
  await page.getByTestId('bag-карта').click(); await page.waitForTimeout(300);
  const s = await sentences();
  check(`құралған сөйлемдер: ${JSON.stringify(s)}`, JSON.stringify(s) === JSON.stringify(['Мен саяхатқа карта аламын.', 'Мен саяхатқа су аламын.']));
  check(`сөйлем жолы: "${await strip()}"`, (await strip()) === 'Мен саяхатқа карта аламын.');
  await page.getByTestId('sentence-су').click(); await page.waitForTimeout(400);
  check(`белгішені басу сөйлемді қайта көрсетеді: "${await strip()}"`, (await strip()) === 'Мен саяхатқа су аламын.');
  await page.getByTestId('sentence-slot').click(); await page.waitForTimeout(400);
  check(`сөйлем орнын басу тазалайды: "${await strip()}"`, (await strip()) === 'Мен саяхатқа аламын.');
  await page.getByTestId('bag-карта').click(); await page.waitForTimeout(400);
  check('сөйлем әрекеті балл қоспайды (баллды мұғалім қояды)', (await score()) === '0 / 10');
  await page.screenshot({ path: `${out}/s2-filled-${vw}.png` });

  await page.keyboard.press('Shift+T'); await page.waitForTimeout(500);
  await page.getByText('Үлгіні көрсету').click(); await page.waitForTimeout(400);
  const ex = page.getByTestId('example');
  check('мұғалім үлгіні ашады', (await ex.count()) === 1 && (await ex.innerText()) === 'Үлгі: «Мен саяхатқа карта аламын. Мен саяхатқа су аламын.»');
  for (let i = 0; i < 3; i++) await page.getByTestId('score-bag-named-1').click();
  for (let i = 0; i < 3; i++) await page.getByTestId('score-bag-sentence-1').click();
  await page.waitForTimeout(300);
  check(`мұғалім 2 балл берді, қайталау қоспайды → ${await score()}`, (await score()) === '2 / 10');
  await page.getByTestId('score-bag-sentence-0').click(); await page.waitForTimeout(200);
  check(`мұғалім баллды түзете алады → ${await score()}`, (await score()) === '1 / 10');
  await page.screenshot({ path: `${out}/s2-teacher-${vw}.png` });

  await page.getByText('Тапсырманы reset').click(); await page.waitForTimeout(400);
  await page.waitForTimeout(800); // exit-анимациялар аяқталуы үшін
  check('тапсырманы reset: балл 0, сөмке бос, үлгі жабық, қызыл белгі жоқ', (await score()) === '0 / 10' && (await bagWords()).length === 0 && (await sentences()).length === 0 && (await page.getByTestId('example').count()) === 0 && (await page.locator('[data-state="wrong"]').count()) === 0);
  check(`console/page errors: ${errors.length ? errors : 'none'}`, errors.length === 0);
  await page.close();
}
console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
