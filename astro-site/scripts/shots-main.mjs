// Five main pages at 390/768/1440: node scripts/shots-main.mjs http://localhost:4331 screenshots/2026-11-17-before
import { chromium } from 'playwright';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:4331';
const out = process.argv[3];
if (!out) throw new Error('output folder required');
if (existsSync(out) && readdirSync(out).length) throw new Error(`${out} already has files; choose a new folder`);
mkdirSync(out, { recursive: true });
const pages = [['home', '/'], ['stafi', '/stafi'], ['jeta', '/lajme'], ['prinderit', '/per-prinder']];
const browser = await chromium.launch();
for (const [name, path] of pages) {
  for (const w of [390, 768, 1440]) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await p.evaluate(() => Promise.race([Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }); })), new Promise((r) => setTimeout(r, 8000))]));
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: true });
    await p.close();
  }
}
await browser.close();
console.log('shots done ->', out);
