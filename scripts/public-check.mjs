// Logged-out check of the public production address (fresh browser context: no cookies, no bypass token).
// node scripts/public-check.mjs https://mitrushkuteli.vercel.app screenshots/2026-11-17-public
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const base = process.argv[2];
const out = process.argv[3];
mkdirSync(out, { recursive: true });
const pages = [['home', '/'], ['stafi', '/stafi'], ['jeta', '/lajme'], ['prinderit', '/per-prinder']];
// Optional: PUBLIC_CHECK_IP maps only the hostname to a reachable edge IP (TLS/SNI still use the real name).
const ip = process.env.PUBLIC_CHECK_IP;
const browser = await chromium.launch(ip ? { args: [`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`] } : {});
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
for (const [name, path] of pages) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const bad = [];
  p.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  const res = await p.goto(base + path, { waitUntil: 'networkidle' });
  ok(res.status() === 200 && new URL(p.url()).hostname === new URL(base).hostname, `${path}: 200, final host ${new URL(p.url()).hostname}, no login redirect`);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; }); });
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => ({
    nav: [...document.querySelectorAll('#primary-nav .nav-list a')].map((a) => a.textContent.trim()).join('|'),
    robots: document.querySelector('meta[name=robots]')?.content,
    broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
    imgs: document.images.length,
    heroBg: getComputedStyle(document.querySelector('.hero') || document.body).backgroundColor,
    title: document.title,
  }));
  ok(info.nav === 'Ballina|Shkolla|Stafi|Jeta shkollore|Për prindërit', `${path}: five nav links (${info.nav})`);
  ok(info.robots === 'index, follow', `${path}: robots meta = ${info.robots}`);
  ok(info.broken === 0 && !bad.length, `${path}: ${info.imgs} images, ${info.broken} broken, failed requests: ${bad.length ? bad.join(', ') : 'none'}`);
  if (name === 'home') ok(info.heroBg === 'rgb(255, 255, 255)', `home: white hero (new design), bg ${info.heroBg}`);
  await p.screenshot({ path: `${out}/${name}-1440.png`, fullPage: true });
  await ctx.close();
}
// Mobile and tablet screenshots of the five pages. Fetches run inside the page so the host mapping applies.
for (const [w, h] of [[390, 844], [768, 1024]]) {
  const m = await browser.newContext({ viewport: { width: w, height: h } });
  const mp = await m.newPage();
  for (const [name, path] of pages) {
    await mp.goto(base + path, { waitUntil: 'networkidle' });
    await mp.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await mp.waitForTimeout(1200);
    const over = await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    ok(!over, `${path} at ${w}px: no horizontal overflow`);
    await mp.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: true });
  }
  if (w === 390) {
    const rb = await mp.evaluate(async (b) => { const r = await fetch(b + '/robots.txt'); return { s: r.status, t: await r.text() }; }, base);
    ok(rb.s === 200 && /Allow: \//.test(rb.t) && !/Disallow: \/\s*$/m.test(rb.t), 'robots.txt public and allows crawling');
    const d = await mp.evaluate(async (b) => { const r = await fetch(b + '/documents/orari-i-konsultimeve-2026-27.png'); return { s: r.status, c: r.headers.get('content-type') }; }, base);
    ok(d.s === 200 && /image\/png/.test(d.c), 'document download 200 image/png');
  }
  await m.close();
}
await browser.close();
console.log(fail ? `FAILURES: ${fail}` : 'PUBLIC CHECK OK');
process.exit(fail ? 1 : 0);
