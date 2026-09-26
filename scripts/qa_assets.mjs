// ASSET QA: әр экранда нақты көрсетілген asset-тер manifest-тегі SCREEN_ASSETS-пен сәйкес пе,
// кейіпкерлердің бәрі мектеп формасында ма, placeholder/бұзық сурет жоқ па.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const src = readFileSync('src/assets/manifest.ts', 'utf8');
const declared = {};
for (const m of src.matchAll(/^\s+(\d+): \[([^\]]*)\]/gm)) declared[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
const uniform = new Set([...src.matchAll(/'([^']+)': A\(\{[^}]*characterStyle: 'uniform'/g)].map((m) => m[1]));
const characters = new Set([...src.matchAll(/'([^']+)': A\(\{[^}]*kind: 'character'/g)].map((m) => m[1]));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
let ok = true;
for (let n = 1; n <= 16; n++) {
  await page.goto(`http://localhost:4173/#s${n}`);
  await page.reload(); await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({
    used: [...new Set([...document.querySelectorAll('[data-stage] [data-asset]')].map((e) => e.dataset.asset))],
    placeholders: [...document.querySelectorAll('[data-placeholder]')].length,
    broken: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length,
  }));
  // ScoreBadge жұлдызы барлық экранда (2–16) ортақ UI — экранның өз тізіміне кірмейді
  const used = info.used.filter((a) => !(a === 'ui.star' && n > 1)).sort();
  const decl = (declared[n] ?? []).filter((a) => a !== 'ui.star').sort();
  const usedNoStar = used.filter((a) => a !== 'ui.star');
  const chars = usedNoStar.filter((a) => characters.has(a));
  const nonUniform = chars.filter((a) => !uniform.has(a));
  const match = JSON.stringify(usedNoStar) === JSON.stringify(decl);
  const pass = match && nonUniform.length === 0 && info.placeholders === 0 && info.broken === 0;
  ok &&= pass;
  console.log(pass ? 'PASS' : 'FAIL', `screen ${n}:`, usedNoStar.join(', '), '| кейіпкер:', chars.join(', ') || '—', match ? '' : `| manifest: ${decl.join(', ')}`, nonUniform.length ? `| NON-UNIFORM ${nonUniform}` : '');
}
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
