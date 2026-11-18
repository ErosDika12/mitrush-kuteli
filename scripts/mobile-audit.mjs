// Phone audit: overflow, text under 14px, tap targets under 44px (block-level controls), menu behaviour, filters.
// node scripts/mobile-audit.mjs http://localhost:4331 [width]
import { chromium } from 'playwright';
const base = process.argv[2];
const width = Number(process.argv[3] || 360);
const ip = process.env.PUBLIC_CHECK_IP;
const browser = await chromium.launch(ip ? { args: [`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`] } : {});
const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const pages = ['/', '/stafi', '/aktivitete', '/lajme', '/klubet', '/galeria', '/per-prinder', '/konsultimet', '/oraret', '/dokumente', '/kontakti'];

for (const path of pages) {
  await p.goto(base + path, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const vis = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 && !el.closest('[hidden]') && !el.closest('.sr-only'); };
    const small = new Set();
    for (const el of document.querySelectorAll('main *, header *, footer *, nav *')) {
      if (!vis(el) || el.children.length && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const has = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!has) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 13.9) small.add(`${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0]} ${fs}px "${el.textContent.trim().slice(0, 30)}"`);
    }
    const tiny = [];
    for (const el of document.querySelectorAll('a, button, input, select, summary')) {
      if (!vis(el)) continue;
      if (el.closest('p, li > span, figcaption') && el.tagName === 'A' && getComputedStyle(el).display === 'inline') continue; // in-text link
      if (el.classList.contains('skip')) continue;
      const b = el.getBoundingClientRect();
      if (b.height < 43.5 || b.width < 43.5) tiny.push(`${el.tagName.toLowerCase()} ${Math.round(b.width)}x${Math.round(b.height)} "${(el.textContent || el.getAttribute('aria-label') || el.type || '').trim().slice(0, 28)}"`);
    }
    return { over: document.documentElement.scrollWidth - innerWidth, small: [...small], tiny, headerH: Math.round(document.querySelector('.site-header').getBoundingClientRect().height) };
  });
  ok(r.over <= 1, `${path}: no horizontal overflow (${r.over})`);
  ok(r.small.length === 0, `${path}: no text under 14px${r.small.length ? ' → ' + r.small.slice(0, 4).join(' | ') : ''}`);
  ok(r.tiny.length === 0, `${path}: tap targets >= 44px${r.tiny.length ? ' → ' + r.tiny.slice(0, 5).join(' | ') : ''}`);
  if (path === '/') ok(r.headerH <= 64, `header height ${r.headerH}px`);
}

// Menu: opens, shows close, five links + quick links, active state, closes on link, no scroll lock left behind
await p.goto(base + '/per-prinder', { waitUntil: 'networkidle' });
const toggle = p.locator('#nav-toggle');
await toggle.tap();
ok((await toggle.getAttribute('aria-expanded')) === 'true' && (await p.locator('#primary-nav').isVisible()), 'menu opens by touch');
ok((await toggle.innerText()).includes('Mbyll') && (await toggle.locator('.t-close').isVisible()), 'open menu shows an obvious close control (Mbyll)');
ok((await p.locator('#primary-nav .nav-list a').allInnerTexts()).join('|') === 'Ballina|Stafi|Jeta shkollore|Për prindërit', 'menu: exactly four primary links');
ok((await p.locator('#primary-nav .nav-list a[aria-current="page"]').innerText()) === 'Për prindërit', 'menu: active section is marked');
ok((await p.locator('#primary-nav .nav-quick a').allInnerTexts()).join('|') === 'Orari|Konsultimet|Kontakti', 'menu: Orari, Konsultimet, Kontakti quick links');
ok((await p.locator('#primary-nav a[href^="tel:"]').count()) >= 1 && (await p.locator('#primary-nav a[href^="mailto:"]').count()) === 1, 'menu: phone and email are actionable');
ok(await p.evaluate(() => document.documentElement.classList.contains('lock')), 'menu: background scroll locked while open');
const nav = await p.evaluate(() => { const n = document.getElementById('primary-nav').getBoundingClientRect(); const h = document.querySelector('.site-header').getBoundingClientRect(); return { top: n.top, hb: h.bottom, bottom: n.bottom, vh: innerHeight }; });
ok(Math.abs(nav.top - nav.hb) <= 1 && nav.bottom >= nav.vh - 1, 'menu panel starts below the header and fills the screen');
await p.locator('#primary-nav .nav-quick a', { hasText: 'Orari' }).tap(); // in-page anchor on this page
await p.waitForTimeout(300);
ok((await toggle.getAttribute('aria-expanded')) === 'false' && !(await p.evaluate(() => document.documentElement.classList.contains('lock'))), 'menu closes after an in-page link and releases the scroll lock');
await toggle.tap();
await p.keyboard.press('Escape');
ok((await toggle.getAttribute('aria-expanded')) === 'false', 'Escape closes the menu');
await toggle.tap();
await toggle.tap();
ok((await toggle.getAttribute('aria-expanded')) === 'false' && !(await p.evaluate(() => document.documentElement.classList.contains('lock'))), 'close button closes the menu');
await toggle.tap();
await Promise.all([p.waitForURL('**/stafi'), p.locator('#primary-nav .nav-list a', { hasText: 'Stafi' }).tap()]);
ok(!(await p.evaluate(() => document.documentElement.classList.contains('lock'))) && (await p.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden', 'after navigation the new page scrolls (no lock)');

// Staff filters on a phone
const filtersBox = await p.locator('#staff-filters').boundingBox();
ok(filtersBox.height <= 230, `staff filter panel is compact (${Math.round(filtersBox.height)}px)`);
await p.fill('#f-q', 'muzik');
ok((await p.locator('[data-person]:visible').count()) === 1, 'staff search "muzik" finds Hasime');
ok(await p.locator('#staff-clear').isVisible(), 'a clear-filters button appears when filtering');
await p.fill('#f-q', 'zzzz');
ok(await p.locator('#staff-empty').isVisible(), 'empty-search state is shown');
await p.locator('#staff-empty-reset').tap();
ok((await p.locator('#staff-count').innerText()).includes('35 nga 35'), 'reset restores the full count');

// Consultation cards
await p.goto(base + '/per-prinder', { waitUntil: 'networkidle' });
const card = await p.evaluate(() => { const r = document.querySelector('#sec-teaching tr[data-consult]'); const b = r.getBoundingClientRect(); return { w: b.width, over: r.scrollWidth - r.clientWidth, txt: r.innerText.replace(/\s+/g, ' ') }; });
ok(card.over <= 1 && card.w <= width, `consultation card readable without sideways scroll: ${card.txt}`);
await browser.close();
console.log(fail ? `MOBILE AUDIT FAILURES: ${fail}` : 'MOBILE AUDIT OK');
process.exit(fail ? 1 : 0);
