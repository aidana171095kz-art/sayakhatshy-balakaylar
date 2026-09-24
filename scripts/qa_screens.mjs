// QA: screenshots of screens at several viewport sizes + console error capture.
// Usage: node scripts/qa_screens.mjs <outDir> [screen...]
import { chromium } from 'playwright';
const [outDir, ...screens] = process.argv.slice(2);
const sizes = [
  ['projector', 1920, 1080],
  ['laptop', 1366, 768],
  ['tablet', 1024, 768],
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const errors = [];
for (const [name, w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  for (const s of screens.length ? screens : ['1']) {
    await page.goto(`http://localhost:4173/#s${s}`);
    await page.reload();
    await page.waitForTimeout(1800);
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight > innerHeight,
      broken: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src),
      placeholders: [...document.querySelectorAll('[data-placeholder]')].map((e) => e.dataset.asset),
    }));
    console.log(name, 'screen', s, JSON.stringify(overflow));
    await page.screenshot({ path: `${outDir}/s${s}-${name}.png` });
  }
  await page.close();
}
console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
