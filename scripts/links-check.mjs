// Every internal link/anchor on every route resolves; no overflow at 390/768/1280/1440; contrast of accent text.
// node scripts/links-check.mjs http://localhost:4331
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:4331';
const routes = ['/', '/shkolla', '/stafi', '/lajme', '/lajme/suksese-ne-garen-ars-kosova-2026', '/aktivitete', '/klubet', '/galeria', '/oraret', '/per-prinder', '/konsultimet', '/dokumente', '/kontakti', '/kerko', '/privatesia', '/festat/28-nentori', '/nuk-ekziston'];
const browser = await chromium.launch();
const ctx = await browser.newContext();
const problems = [];
const checked = new Map();
const external = new Set();
let linkCount = 0;
const page = await ctx.newPage();
for (const r of routes) {
  if (r === '/nuk-ekziston') continue; // 404 page checked for status elsewhere
  await page.goto(base + r, { waitUntil: 'networkidle' });
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), text: ((a.getAttribute('aria-label') || '') + (a.textContent || '') + [...a.querySelectorAll('img')].map((i) => i.alt || '').join('')).trim() })));
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label')).length);
  if (buttons) problems.push(`${r}: ${buttons} unlabeled button(s)`);
  for (const l of links) {
    linkCount++;
    if (!l.text) problems.push(`${r}: link ${l.href} has no accessible text`);
    if (/^https?:/.test(l.href)) { external.add(l.href); continue; }
    if (/^(mailto|tel):/.test(l.href)) continue;
    const [pathPart, hash] = l.href.split('#');
    const target = pathPart || r;
    const key = target.split('?')[0];
    if (!checked.has(key)) {
      const res = await ctx.request.get(base + key);
      checked.set(key, { status: res.status(), html: res.status() === 200 ? await res.text() : '' });
    }
    const c = checked.get(key);
    if (c.status !== 200) problems.push(`${r}: ${l.href} -> ${c.status}`);
    else if (hash && !new RegExp(`id="${hash}"`).test(c.html)) problems.push(`${r}: ${l.href} anchor #${hash} not found`);
  }
}
console.log(`links examined: ${linkCount}; distinct internal targets: ${checked.size}; external links (not fetched): ${external.size}`);
for (const w of [390, 768, 1280, 1440]) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 } });
  const bad = [];
  for (const r of routes.slice(0, -1)) {
    await p.goto(base + r, { waitUntil: 'networkidle' });
    const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const brand = await p.evaluate(() => { const b = document.querySelector('.brand-text'); return b ? b.scrollWidth <= b.clientWidth + 1 : true; });
    if (o > 0) bad.push(`${r}(+${o}px)`);
    if (!brand) bad.push(`${r}(brand clipped)`);
  }
  if (bad.length) problems.push(`overflow/clipping at ${w}px: ${bad.join(' ')}`);
  console.log(`width ${w}: ${bad.length ? 'PROBLEMS ' + bad.join(' ') : 'no overflow, header text not clipped on ' + (routes.length - 1) + ' routes'}`);
  await p.close();
}
// Contrast (WCAG) of the accent text colours used on their backgrounds
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
for (const [name, fg, bg] of [['gold-text on ivory', '#7d5f25', '#f8f7f3'], ['gold-text on white', '#7d5f25', '#ffffff'], ['slate-text on ivory', '#55596b', '#f8f7f3'], ['navy on ivory', '#17243b', '#f8f7f3'], ['raw gold #B28A45 on white (not used for text)', '#b28a45', '#ffffff'], ['hero gold #e6c98a on navy', '#e6c98a', '#17243b']]) console.log(`contrast ${name}: ${ratio(fg, bg)}:1`);
await browser.close();
if (problems.length) { console.log('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
console.log('LINKS OK');
