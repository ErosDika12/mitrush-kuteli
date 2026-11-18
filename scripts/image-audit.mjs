// Real-render image audit: every <img> on every page must load (HTTP 200, naturalWidth > 0), no failed image requests,
// and every staff portrait promised by the data must be rendered as a loaded picture (not initials).
// node scripts/image-audit.mjs <base>   (PUBLIC_CHECK_IP=<edge ip> for the live site)
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2];
const ip = process.env.PUBLIC_CHECK_IP;
const staff = JSON.parse(fs.readFileSync('src/data/staff.json', 'utf8'));
const expected = staff.filter((s) => s.portrait?.approved).map((s) => s.id);
const browser = await chromium.launch(ip ? { args: [`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`] } : {});
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const pages = ['/', '/stafi', '/aktivitete', '/klubet', '/galeria', '/lajme', '/lajme/suksese-ne-garen-ars-kosova-2026', '/per-prinder', '/oraret', '/dokumente', '/kontakti'];
for (const w of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 700, hasTouch: w < 700 });
  const p = await ctx.newPage();
  const bad = [];
  p.on('response', (r) => { if (r.request().resourceType() === 'image' && r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  p.on('requestfailed', (r) => { if (r.resourceType() === 'image') bad.push('failed ' + r.url()); });
  for (const path of pages) {
    await p.goto(base + path, { waitUntil: 'networkidle' });
    // scroll through so lazy images load
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    // force every lazy image to load, then wait for each to settle
    await p.evaluate(async () => {
      const imgs = [...document.images].filter((i) => i.getAttribute("src") || i.currentSrc);
      imgs.forEach((i) => { i.loading = "eager"; });
      await Promise.all(imgs.map((i) => new Promise((res) => { if (i.complete) return res(); i.addEventListener("load", res); i.addEventListener("error", res); setTimeout(res, 8000); })));
    });
    const broken = await p.evaluate(() => [...document.images].filter((i) => (i.getAttribute("src") || i.currentSrc) && !(i.complete && i.naturalWidth > 0)).map((i) => i.currentSrc || i.src));
    ok(broken.length === 0, `${w}px ${path}: all ${await p.locator('img').count()} images loaded${broken.length ? ' → BROKEN: ' + broken.slice(0, 3).join(' | ') : ''}`);
  }
  ok(bad.length === 0, `${w}px: no failed image requests${bad.length ? ' → ' + bad.slice(0, 3).join(' | ') : ''}`);
  await p.goto(base + '/stafi', { waitUntil: 'networkidle' });
  await p.evaluate(async () => {
    const imgs = [...document.images]; imgs.forEach((i) => { i.loading = "eager"; });
    await Promise.all(imgs.map((i) => new Promise((res) => { if (i.complete) return res(); i.addEventListener("load", res); i.addEventListener("error", res); setTimeout(res, 8000); })));
  });
  const shown = await p.evaluate(() => [...document.querySelectorAll('[data-person]')].filter((a) => { const i = a.querySelector('.portrait img'); return i && i.complete && i.naturalWidth > 0; }).map((a) => a.dataset.id));
  const missing = expected.filter((id) => !shown.includes(id));
  ok(missing.length === 0 && shown.length === expected.length, `${w}px /stafi: ${shown.length}/${expected.length} approved portraits rendered as loaded pictures${missing.length ? ' → missing ' + missing.join(',') : ''}`);
  // portraits must be fully visible (not clipped to zero) and uniform in ratio
  const ratios = await p.evaluate(() => [...document.querySelectorAll('.sd-grid .portrait')].map((el) => { const b = el.getBoundingClientRect(); return +(b.width / b.height).toFixed(2); }));
  ok(ratios.length > 0 && new Set(ratios).size === 1, `${w}px /stafi: ${ratios.length} portrait tiles share one ratio (${[...new Set(ratios)]})`);
  await ctx.close();
}
await browser.close();
console.log(fail ? `IMAGE AUDIT FAILURES: ${fail}` : 'IMAGE AUDIT OK');
process.exit(fail ? 1 : 0);
