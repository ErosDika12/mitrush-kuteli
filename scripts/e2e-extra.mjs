// Extra browser checks: dropdowns, downloads, contact links, document-vs-page comparison, text size.
// node scripts/e2e-extra.mjs http://localhost:4331
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:4331';
const results = [];
const ok = (n, c, d = '') => { results.push(c); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();

// --- Five primary links, section sub-navigation
await page.goto(base + '/', { waitUntil: 'networkidle' });
const prim = await page.locator('#primary-nav .nav-list a').allInnerTexts();
ok('desktop nav: exactly four primary links', JSON.stringify(prim) === JSON.stringify(['Ballina', 'Stafi', 'Jeta shkollore', 'Për prindërit']), prim.join(' | '));
ok('desktop nav: mobile menu button hidden, no dropdown toggles', !(await page.locator('#nav-toggle').isVisible()) && (await page.locator('.sub-toggle').count()) === 0);
ok('desktop nav: no Kontakti tab among the primary links', !prim.includes('Kontakti'));
for (const [url, label] of [['/oraret', 'Për prindërit'], ['/konsultimet', 'Për prindërit'], ['/dokumente', 'Për prindërit'], ['/kontakti', 'Për prindërit'], ['/lajme', 'Jeta shkollore'], ['/klubet', 'Jeta shkollore'], ['/galeria', 'Jeta shkollore'], ['/stafi', 'Stafi'], ['/', 'Ballina']]) {
  await page.goto(base + url, { waitUntil: 'domcontentloaded' });
  const cur = await page.locator('#primary-nav .nav-list a[aria-current="page"]').allInnerTexts();
  ok(`active primary link on ${url} is "${label}"`, cur.length === 1 && cur[0] === label, cur.join(','));
}
await page.goto(base + '/per-prinder', { waitUntil: 'networkidle' });
const sub = await page.locator('.section-nav a').allInnerTexts();
ok('Për prindërit sub-navigation', JSON.stringify(sub) === JSON.stringify(['Përmbledhje', 'Orari', 'Konsultimet', 'Dokumentet', 'Kontakti']), sub.join(' | '));
await page.locator('.section-nav a', { hasText: 'Orari' }).click();
await page.waitForURL('**/oraret');
ok('sub-navigation link reaches /oraret with Orari current', (await page.locator('.section-nav a[aria-current="page"]').innerText()) === 'Orari');
await page.goto(base + '/aktivitete', { waitUntil: 'networkidle' });
const sub2 = await page.locator('.section-nav a').allInnerTexts();
ok('Jeta shkollore sub-navigation', JSON.stringify(sub2) === JSON.stringify(['Përmbledhje', 'Lajme', 'Klubet', 'Galeria']), sub2.join(' | '));
for (const u of ['/', '/stafi', '/kontakti', '/per-prinder']) {
  const h = await (await ctx.request.get(base + u)).text();
  ok(`contact details in footer on ${u}`, h.includes('mailto:shfmu.mitrush.kuteli@rks-gov.net') && h.includes('tel:+38338226671'));
}
await page.goto(base + '/', { waitUntil: 'networkidle' }); await page.keyboard.press('Tab');
ok('skip link is first focus stop', (await page.evaluate(() => document.activeElement && document.activeElement.className)) === 'skip');

// --- Staff placement
await page.goto(base + '/stafi', { waitUntil: 'networkidle' });
ok('staff: 45 cards, one per person (Hasime once)', (await page.locator('[data-person]').count()) === 45 && (await page.locator('[data-person][data-id="hasime-mehmeti"]').count()) === 1);
ok('staff: Hasime sits in administration with both roles', (await page.locator('[data-group-section="udheheqja"] [data-id="hasime-mehmeti"]').innerText()).includes('Koordinatore') && (await page.locator('[data-group-section="udheheqja"] [data-id="hasime-mehmeti"]').innerText()).includes('Mësimdhënëse e muzikës'));
await page.goto(base + '/stafi?lenda=' + encodeURIComponent('Art muzikor'), { waitUntil: 'networkidle' });
ok('staff: music subject filter finds Hasime', (await page.locator('[data-person]:visible').count()) === 1 && (await page.locator('[data-person]:visible').innerText()).includes('Hasime'));
for (const [g, n] of [['udheheqja', 3], ['lendore', 18], ['fillor', 18], ['parashkollor', 2], ['mbeshtetese', 3], ['psikologia', 1], ['teknik', 0]]) ok('staff section ' + g + ' has ' + n, (await page.locator('[data-group-section="' + g + '"] [data-person]').count()) === n);
await page.goto(base + '/stafi?q=muzik', { waitUntil: 'networkidle' });
ok('staff: searching "muzik" finds Hasime once and shows the music cross-reference', (await page.locator('[data-person]:visible').count()) === 1 && (await page.locator('[data-see]:visible').count()) === 1);
await page.goto(base + '/stafi?q=psikolog', { waitUntil: 'networkidle' });
ok('staff: role search finds the psychologist', (await page.locator('[data-person]:visible').innerText()).includes('Taibe Morina'));
await page.goto(base + '/stafi', { waitUntil: 'networkidle' });
ok('staff: Merita Hoti and Merita Sejdiu are separate cards', (await page.locator('[data-person][data-id="merita-hoti"]').count()) === 1 && (await page.locator('[data-person][data-id="merita-sejdiu"]').count()) === 1);
ok('staff: no "position missing" message', !(await page.locator('main').innerText()).includes('nuk është specifikuar'));

// --- Documents: served, real PNGs, downloadable
await page.goto(base + '/dokumente', { waitUntil: 'networkidle' });
const docs = [['orari-i-ziles-2026-27.png', 602, 817], ['orari-i-konsultimeve-2026-27.png', 533, 871], ['orari-mesimor-javor-2026-27.png', 1190, 870]];
for (const [f, w, h] of docs) {
  const r = await ctx.request.get(`${base}/documents/${f}`);
  const buf = await r.body();
  const png = buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const dw = buf.readUInt32BE(16), dh = buf.readUInt32BE(20);
  const disk = fs.readFileSync(`public/documents/${f}`);
  ok(`document ${f}: 200, image/png, real PNG ${dw}x${dh}`, r.status() === 200 && (r.headers()['content-type'] || '').includes('image/png') && png && dw === w && dh === h && Buffer.compare(buf, disk) === 0);
}
const dl = page.locator('.doc a[download]').first();
const [download] = await Promise.all([page.waitForEvent('download'), dl.click()]);
const dlPath = await download.path();
ok('download: first document downloads with PNG filename', download.suggestedFilename().endsWith('.png') && fs.statSync(dlPath).size > 10000, download.suggestedFilename());
ok('documents: 4 listed; historical plan is external PDF link, not downloaded copy', (await page.locator('.doc').count()) === 4 && (await page.locator('.doc a[href^="https://prishtinaonline.com"]').count()) === 1);
ok('documents: no file labelled PDF is a PNG', !(await page.locator('.doc:has-text("PNG") :text("PDF")').count()));
const tags = await page.locator('.doc .meta').allInnerTexts();
ok('documents: formats and sizes shown (3 PNG with sizes, 1 PDF)', tags.filter((t) => /PNG, \d+([,.]\d+)? (KB|MB)/.test(t.replace(/\s+/g, ' '))).length === 3 && tags.filter((t) => /\bPDF\b/.test(t)).length === 1, tags.map((t) => t.replace(/\s+/g, ' ')).join(' | '));

// --- Contact links
const home = await (await ctx.request.get(base + '/kontakti')).text();
ok('contact: mailto link to directory email', home.includes('href="mailto:shfmu.mitrush.kuteli@rks-gov.net'));
ok('contact: tel:+38338226671 and display 038 226 671', home.includes('href="tel:+38338226671"') && home.includes('038 226 671'));
ok('contact: no fake send-success message', !/Mesazhi u dërgua|u dërgua me sukses/.test(home));
ok('contact: no form element (no pretend submission)', !/<form/.test(home.replace(/<form[^>]*role="search"[\s\S]*?<\/form>/g, '')));
await page.goto(base + '/kontakti');
const ext = await page.locator('a[target="_blank"]').evaluateAll((as) => as.map((a) => [a.href, a.rel]));
ok('contact: external links have rel=noopener noreferrer', ext.length >= 3 && ext.every(([, rel]) => /noopener/.test(rel) && /noreferrer/.test(rel)), String(ext.length));
ok('contact: Facebook link is the corroborated profile URL', ext.some(([h]) => h === 'https://www.facebook.com/profile.php?id=100057725970264'));
ok('contact: map links built from the street address, no embedded map', ext.some(([h]) => h.includes('google.com/maps/search') && h.includes('Sokol')) && (await page.locator('iframe').count()) === 0);
await page.goto(base + '/kontakti'); const mailHref = await page.locator('a[href^="mailto:"]').first().getAttribute('href');
ok('contact: no placeholder contact details anywhere in footer/home', !/info@mitrushkuteli|38 000 000/.test(await (await ctx.request.get(base + '/')).text()), mailHref);

// --- Bell schedule vs signed document (expected values typed from the scan, not from the data file)
await page.goto(base + '/oraret', { waitUntil: 'networkidle' });
const expectedBells = { first: ['07:30–08:15', '08:20–09:05', '09:10–09:55', '10:20–11:05', '11:10–11:55', '12:00–12:45'], second: ['13:10–13:55', '14:00–14:45', '15:00–15:45', '15:50–16:35', '16:40–17:25'] };
for (const [i, key] of [[0, 'first'], [1, 'second']]) {
  const rows = await page.locator('#zilja table').nth(i).locator('tbody tr:not(.gap-row)').allInnerTexts();
  const norm = rows.map((r) => r.replace(/\s+/g, ' ').trim());
  const exp = expectedBells[key].map((t, k) => `${k + 1} ${t}`);
  ok(`bells vs document: ${key} shift rows identical`, JSON.stringify(norm) === JSON.stringify(exp), norm.join(' ; '));
}
const para = (await page.locator('#zilja table').nth(2).innerText()).replace(/\s+/g, ' ');
ok('bells vs document: Grupi i parë 07:45–11:45, Grupi i dytë 12:00–16:00', para.includes('Grupi i parë 07:45–11:45') && para.includes('Grupi i dytë 12:00–16:00'));
const gapTxt = await page.locator('#zilja .gap-row').allInnerTexts();
ok('bells: derived gaps are labelled as computed (09:55–10:20, 14:45–15:00)', gapTxt.length === 2 && gapTxt[0].includes('09:55–10:20') && gapTxt[1].includes('14:45–15:00') && gapTxt.every((t) => t.includes('i llogaritur')));

// --- Consultations vs scanned sheet (typed from the scan image)
const sheet = [
  ['Bukurije Kameri', 'Gjuhë shqipe', 'E premte', '09:10–09:55'], ['Luljeta Haxhiaj', 'Gjuhë shqipe', 'E martë', '09:10–09:55'], ['Fortesa Gashi', 'Gjuhë shqipe', 'E mërkurë', '08:20–09:05'],
  ['Edona Novobërdaliu', 'Gjuhë angleze', 'E martë', '10:20–11:05'], ['Kemall Islami', 'Gjuhë angleze', 'E enjte', '11:10–11:55'], ['Sebahate Gashi', 'Gjuhë gjermane', 'E mërkurë', '09:10–09:55'],
  ['Hasime Mehmeti', 'Art muzikor', 'E enjte', '10:20–11:05'], ['Matjane Kallaba', 'Art figurativ', 'E enjte', '09:10–09:55'], ['Arta Kllokoqi', 'Matematikë', 'E enjte', '09:10–09:55'],
  ['Hikmete Limani', 'Matematikë', 'E mërkurë', '09:10–09:55'], ['Nora Vitia', 'Gjeografi', 'E mërkurë', '09:10–09:55'], ['Albert Muslija', 'Histori', 'E enjte', '10:20–11:05'],
  ['Njomza Jetullahu', 'Edukatë qytetare', 'E mërkurë', '10:20–11:05'], ['Aktere Ymeri', 'Biologji', 'E mërkurë', '10:20–11:05'], ['Leonarda Berisha', 'Fizikë', 'E premte', '09:10–09:55'],
  ['Shkëlzen Asimi', 'Kimi', 'E martë', '08:20–09:05'], ['Diellona Kabashi', 'TIK', 'E enjte', '10:20–11:05'], ['Fahrije Korça', 'Edukatë fizike dhe sport', 'E mërkurë', '10:20–11:05'],
  ['Merita Sejdiu', 'Mësuese mbështetëse', 'E hënë dhe e martë', '12:00–13:00'],
  ['Remzije Racaj', 'Drejtoreshë', 'E martë dhe e enjte', '10:00–11:00'], ['Besnik Mehmeti', 'Sekretar', 'Çdo ditë pune', '10:00–11:00'],
  ['Hasime Mehmeti', 'Koordinatore', 'E enjte', '11:00–12:00'], ['Taibe Morina', 'Psikologe', 'E hënë dhe e enjte', '14:00–15:00'],
];
await page.goto(base + '/konsultimet', { waitUntil: 'networkidle' });
const pageRows = (await page.locator('[data-consult]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
let missing = [];
for (const [n, what, day, time] of sheet) {
  const hit = pageRows.find((r) => r.startsWith(n) && r.includes(what) && r.includes(day) && r.endsWith(time));
  if (!hit) missing.push(`${n} / ${what} / ${day} / ${time}`);
}
ok('consultations vs scanned sheet: all 23 rows match name, role/subject, day(s), time', missing.length === 0 && pageRows.length === sheet.length, missing.join(' ; ') || `${pageRows.length} rows`);

// --- Readability: text smaller than 12px, and tiny tap targets on mobile
for (const w of [390, 1280]) {
  const p = await browser.newPage({ viewport: { width: w, height: 900 } });
  const small = [];
  for (const r of ['/', '/stafi', '/oraret', '/konsultimet', '/lajme', '/dokumente', '/galeria', '/kontakti']) {
    await p.goto(base + r, { waitUntil: 'networkidle' });
    const found = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const px = parseFloat(cs.fontSize);
        if (px < 12) out.push(el.tagName + '.' + el.className + ' ' + px + 'px "' + el.textContent.trim().slice(0, 20) + '"');
      }
      return out.slice(0, 3);
    });
    if (found.length) small.push(r + ': ' + found.join('; '));
  }
  ok(`readability at ${w}px: no visible text under 12px`, small.length === 0, small.join(' | '));
  await p.close();
}
{
  const p = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const tiny = await p.evaluate(() => [...document.querySelectorAll('a, button')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width && r.height && cs.display !== 'inline' && (r.height < 40 || r.width < 40) && !e.classList.contains('skip'); }).map((e) => e.className + ':' + e.textContent.trim().slice(0, 15)).slice(0, 5));
  ok('mobile home: block-level tap targets at least 40px', tiny.length === 0, tiny.join(' | '));
  await p.close();
}

await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
