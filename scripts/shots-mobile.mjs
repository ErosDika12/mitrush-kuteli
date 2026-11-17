// Screenshots of every main page at phone, tablet and desktop widths. Refuses a non-empty folder.
// node scripts/shots-mobile.mjs http://localhost:4331 screenshots/2026-11-17-v5-before [widths comma list]
import { chromium } from 'playwright';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
const [base, out, w] = process.argv.slice(2);
if (existsSync(out) && readdirSync(out).length) { console.error('folder not empty: ' + out); process.exit(1); }
mkdirSync(out, { recursive: true });
const widths = (w || '360,390,430,768,1440').split(',').map(Number);
const pages = [
  ['home', '/'], ['shkolla', '/shkolla'], ['stafi', '/stafi'], ['jeta', '/lajme'], ['prinderit', '/per-prinder'],
  ['aktivitete', '/aktivitete'], ['klubet', '/klubet'], ['galeria', '/galeria'], ['kontakti', '/kontakti'], ['oraret', '/oraret'], ['konsultimet', '/konsultimet'], ['dokumente', '/dokumente'],
];
const browser = await chromium.launch(process.env.PUBLIC_CHECK_IP ? { args: [`--host-resolver-rules=MAP ${new URL(base).hostname} ${process.env.PUBLIC_CHECK_IP}`] } : {});
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 800 : 900 }, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 700 });
  const p = await ctx.newPage();
  for (const [name, path] of pages) {
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: '*{scroll-behavior:auto!important} img{content-visibility:visible!important}' });
    await p.evaluate(async () => {
      document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(500);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 1) console.log(`OVERFLOW ${over}px at ${width}px ${path}`);
    await p.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
console.log('shots done ->', out);
