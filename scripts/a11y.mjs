// Runs axe-core on key pages: node scripts/a11y.mjs http://localhost:4331
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:4331';
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch();
let bad = 0;
for (const w of [1280, 390]) for (const r of ['/', '/shkolla', '/stafi', '/lajme', '/lajme/suksese-ne-garen-ars-kosova-2026', '/aktivitete', '/klubet', '/galeria', '/oraret', '/oraret#klasat', '/oraret#origjinali', '/per-prinder', '/konsultimet', '/dokumente', '/kontakti', '/kerko', '/privatesia', '/festat/28-nentori']) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(base + r, { waitUntil: 'networkidle' });
  await p.evaluate(axe);
  const res = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
  for (const v of res.violations) { bad++; console.log(`${w} ${r} [${v.impact}] ${v.id}: ${v.nodes.length} node(s) e.g. ${v.nodes[0].target.join(' ')}`); }
  await p.close();
}
console.log(bad ? `${bad} violation group(s)` : 'axe: no violations');
await b.close();
