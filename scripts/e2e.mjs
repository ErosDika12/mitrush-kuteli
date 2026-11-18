// Browser checks against a running preview: node scripts/e2e.mjs http://localhost:4331
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:4331';
const results = [];
const ok = (n, c, d = '') => { results.push([c, n, d]); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + d : '')); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
const failed = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/nuk-ekziston')) failed.push(r.status() + ' ' + r.url()); });

const routes = ['/', '/shkolla', '/stafi', '/lajme', '/lajme/suksese-ne-garen-ars-kosova-2026', '/lajme/dhoma-burimore-arsim-gjitheperfshires', '/lajme/bashkepunim-per-cilesi-ne-mesimdhenie', '/aktivitete', '/klubet', '/galeria', '/oraret', '/per-prinder', '/konsultimet', '/dokumente', '/kontakti', '/kerko', '/privatesia', '/festat/28-nentori'];
for (const r of routes) {
  await page.goto(base + r, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((res) => setTimeout(res, 40)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(200);
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc));
  const h1 = await page.locator('h1').count();
  ok(`route ${r}: loads, one h1, no broken images`, h1 === 1 && broken.length === 0, broken.join(',') || `h1=${h1}`);
}
ok('no console errors on any route', errors.length === 0, errors.join(' | '));
ok('no failed requests (>=400) on routes', failed.length === 0, failed.join(' | '));
const r404 = await page.goto(base + '/nuk-ekziston');
ok('404 page returns 404 and has content', r404.status() === 404 && (await page.locator('h1').innerText()).includes('nuk u gjet'));


for (const w of [360, 390, 768, 1280, 1440]) {
  const p = await browser.newPage({ viewport: { width: w, height: 800 } });
  const bad = [];
  for (const r of ['/', '/stafi', '/oraret', '/konsultimet', '/galeria', '/lajme', '/kontakti', '/dokumente', '/shkolla']) {
    await p.goto(base + r, { waitUntil: 'networkidle' });
    const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 0) bad.push(r + '(+' + o + ')');
  }
  ok(`no page-level horizontal scroll at ${w}px`, bad.length === 0, bad.join(' '));
  await p.close();
}

{
  const p = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const toggle = p.locator('#nav-toggle');
  ok('mobile: menu hidden initially', !(await p.locator('#primary-nav').isVisible()));
  await toggle.focus();
  await p.keyboard.press('Enter');
  ok('mobile: Enter opens menu', (await toggle.getAttribute('aria-expanded')) === 'true' && (await p.locator('#primary-nav').isVisible()));
  await p.keyboard.press('Escape');
  ok('mobile: Escape closes menu and returns focus', (await toggle.getAttribute('aria-expanded')) === 'false' && (await p.evaluate(() => document.activeElement && document.activeElement.id)) === 'nav-toggle');
  await toggle.click();
  const labels = await p.locator('#primary-nav .nav-list a').allInnerTexts();
  ok('mobile: menu lists exactly the five primary links', JSON.stringify(labels) === JSON.stringify(['Ballina', 'Shkolla', 'Stafi', 'Jeta shkollore', 'Për prindërit']), labels.join(' | '));
  await p.screenshot({ path: 'work/shots/mobile-menu.png' });
  await p.close();
}

const visPeople = async () => page.locator('[data-person]:visible').allInnerTexts();
await page.goto(base + '/stafi?q=Shkelzen', { waitUntil: 'networkidle' });
let vis = await visPeople();
ok('staff: "Shkelzen" finds Shkëlzen Asimi', vis.length === 1 && vis[0].includes('Shkëlzen Asimi'), String(vis.length));
await page.goto(base + '/stafi?q=Akter', { waitUntil: 'networkidle' });
vis = await visPeople();
ok('staff: "Akter" finds Aktere Ymeri', vis.length === 1 && vis[0].includes('Aktere Ymeri'));
await page.goto(base + '/stafi?q=Ymeri', { waitUntil: 'networkidle' });
vis = await visPeople();
ok('staff: alias "Ymeri" finds Aktere Ymeri', vis.length === 1);
await page.goto(base + '/stafi?q=Imeri', { waitUntil: 'networkidle' });
vis = await visPeople();
ok('staff: old formal spelling "Imeri" still finds the same person', vis.length === 1 && vis[0].includes('Aktere Ymeri'));
for (const [q, name] of [['Kemal Islami', 'Kemall Islami'], ['Luljetë Haxhijaj', 'Luljeta Haxhiaj'], ['Nora Vitija', 'Nora Vitia'], ['Albert Muslijaj', 'Albert Muslija'], ['Sebahat', 'Sebahate Gashi']]) {
  await page.goto(base + '/stafi?q=' + encodeURIComponent(q), { waitUntil: 'networkidle' });
  vis = await visPeople();
  ok(`staff alias "${q}" -> ${name} (single person)`, vis.length === 1 && vis[0].includes(name), String(vis.length));
}
await page.goto(base + '/stafi?q=gjerman', { waitUntil: 'networkidle' });
vis = await visPeople();
ok('staff: "gjerman" finds Sebahate Gashi', vis.length === 1 && vis[0].includes('Sebahate Gashi'));
await page.goto(base + '/stafi?q=zzzz', { waitUntil: 'networkidle' });
ok('staff: no-result state shown', await page.locator('#staff-empty').isVisible());
await page.click('#staff-empty-reset');
ok('staff: reset restores all 35 people', (await page.locator('#staff-count').innerText()).includes('35 nga 35'));
await page.goto(base + '/stafi', { waitUntil: 'networkidle' });
await page.selectOption('#f-lenda', 'Matematikë');
ok('staff: subject filter -> 2 math teachers', (await page.locator('[data-person]:visible').count()) === 2);
ok('staff: URL reflects filter', page.url().includes('lenda='));
await page.goBack();
await page.waitForTimeout(200);
ok('staff: back restores unfiltered list', (await page.locator('[data-person]:visible').count()) > 2);

await page.goto(base + '/konsultimet', { waitUntil: 'networkidle' });
const total = await page.locator('[data-consult]').count();
ok('consultations: 23 records', total === 23, String(total));
await page.selectOption('#c-day', '4');
const thu = await page.locator('[data-consult]:visible').allInnerTexts();
ok('consultations: Thursday shows Hasime teaching 10:20–11:05', thu.some((t) => /Hasime Mehmeti[\s\S]*Art muzikor[\s\S]*10:20–11:05/.test(t)));
ok('consultations: Thursday shows Hasime coordination 11:00–12:00', thu.some((t) => /Hasime Mehmeti[\s\S]*koordinim[\s\S]*11:00–12:00/.test(t)));
await page.selectOption('#c-day', '');
const txt = async (name) => (await page.locator(`[data-consult]:has(th:text("${name}"))`).allInnerTexts()).join(' ');
ok('consultations: director Tuesday & Thursday 10:00–11:00', /E martë dhe e enjte[\s\S]*10:00–11:00/.test(await txt('Remzije Racaj')));
ok('consultations: psychologist Monday & Thursday 14:00–15:00', /E hënë dhe e enjte[\s\S]*14:00–15:00/.test(await txt('Taibe Morina')));
ok('consultations: Merita Monday & Tuesday 12:00–13:00', /E hënë dhe e martë[\s\S]*12:00–13:00/.test(await txt('Merita Sejdiu')));
ok('consultations: secretary every working day', /Çdo ditë pune/.test(await txt('Besnik Mehmeti')));
await page.fill('#c-q', 'biologji');
ok('consultations: subject search biologji -> 1 row', (await page.locator('[data-consult]:visible').count()) === 1);
await page.fill('#c-q', 'qqq');
ok('consultations: no-result state', await page.locator('#c-empty').isVisible());

await page.goto(base + '/oraret', { waitUntil: 'networkidle' });
const zilja = await page.locator('#zilja').innerText();
for (const t of ['07:30–08:15', '08:20–09:05', '09:10–09:55', '10:20–11:05', '11:10–11:55', '12:00–12:45', '13:10–13:55', '14:00–14:45', '15:00–15:45', '15:50–16:35', '16:40–17:25', '07:45–11:45', '12:00–16:00']) ok('bells: ' + t, zilja.includes(t));
ok('bells: second shift has exactly 5 periods', (await page.locator('#zilja table').nth(1).locator('tbody tr:not(.gap-row)').count()) === 5);
ok('bells: first shift has 6 periods', (await page.locator('#zilja table').nth(0).locator('tbody tr:not(.gap-row)').count()) === 6);
ok('bells: both parafillor groups', zilja.includes('Grupi i parë') && zilja.includes('Grupi i dytë'));
await page.click('[data-tab="klasat"]');
await page.waitForTimeout(250);
ok('timetable: tab switch shows class view', (await page.locator('#klasat').isVisible()) && !(await page.locator('#zilja').isVisible()));
await page.selectOption('#tt-class', 'VII-2');
await page.selectOption('#tt-day', '0');
const cells = await page.locator('.tt-view:visible td:visible').allInnerTexts();
ok('timetable: VII-2 Monday shows 6 period cells', cells.length === 6, cells.join(' | ').replace(/\n/g, ' '));
ok('timetable: VII-2 Monday flags one duplicated period', (await page.locator('.tt-view:visible td.conflict').count()) === 1);
await page.selectOption('#tt-teacher', 'hikmete-limani');
ok('timetable: teacher view appears', await page.locator('[data-teacher="hikmete-limani"]').isVisible());
await page.click('[data-tab="origjinali"]');
await page.waitForTimeout(250);
ok('timetable: original document viewer present', await page.locator('#origjinali img').isVisible());

await page.goto(base + '/galeria', { waitUntil: 'networkidle' });
await page.locator('[data-lb]').first().focus();
await page.keyboard.press('Enter');
ok('lightbox: opens', await page.locator('#lb').evaluate((d) => d.open));
ok('lightbox: counter 1 / 8', (await page.locator('#lb-count').innerText()) === '1 / 8');
await page.keyboard.press('ArrowRight');
ok('lightbox: ArrowRight -> 2 / 8', (await page.locator('#lb-count').innerText()) === '2 / 8');
ok('lightbox: background scroll locked', await page.evaluate(() => document.documentElement.classList.contains('lock')));
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
ok('lightbox: Escape closes', !(await page.locator('#lb').evaluate((d) => d.open)));
ok('lightbox: focus returns to trigger and scroll unlocked', (await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-index'))) === '0' && !(await page.evaluate(() => document.documentElement.classList.contains('lock'))));

await page.goto(base + '/lajme?kategoria=Muzik%C3%AB', { waitUntil: 'networkidle' });
ok('news: category filter from URL -> 1 article', (await page.locator('[data-news]:visible').count()) === 1);
await page.goto(base + '/lajme?q=zzzz', { waitUntil: 'networkidle' });
ok('news: no-result state', await page.locator('#news-empty').isVisible());

await page.goto(base + '/lajme/suksese-ne-garen-ars-kosova-2026', { waitUntil: 'networkidle' });
const art = await page.locator('article.section').innerText();
ok('article: Ars Kosova shows publication date, no event date', art.includes('12 qershor 2026') && !art.includes('Data e ngjarjes'));
await page.goto(base + '/lajme/bashkepunim-per-cilesi-ne-mesimdhenie', { waitUntil: 'networkidle' });
ok('article: quality story has separate event dates 6–7 tetor 2026', (await page.locator('article.section').innerText()).includes('Data e ngjarjes: 6–7 tetor 2026'));

await page.goto(base + '/kerko?q=Shkelzen', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
ok('site search: Shkelzen finds staff entry', (await page.locator('#s-results').innerText()).includes('Shkëlzen Asimi'));
await page.goto(base + '/kerko?q=ars', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
ok('site search: "ars" finds the news story', (await page.locator('#s-results').innerText()).includes('Ars Kosova'));

const pageText = async (r) => (await ctx.request.get(base + r)).text();
const html = (await Promise.all(['/', '/kontakti', '/oraret', '/stafi'].map(pageText))).join('\n');
for (const bad of ['info@mitrushkuteli', '000 000', '300+', 'localhost', 'Mirë se vini', 'innerHTML']) ok(`hygiene: "${bad}" absent`, !html.includes(bad));
ok('hygiene: real email/phone present', html.includes('shfmu.mitrush.kuteli@rks-gov.net') && html.includes('tel:+38338226671'));
const idx = await pageText('/search-index.json');
ok('hygiene: no unassigned portraits or handwritten notes in search index', !/viber_image|084307/.test(idx));
const robots = await pageText('/robots.txt');
ok('robots: private preview disallows indexing by default', robots.includes('Disallow: /'));
const meta = await pageText('/');
ok('meta: noindex and no canonical without SITE_URL', meta.includes('noindex') && !meta.includes('rel="canonical"'));

const nojs = await browser.newContext({ javaScriptEnabled: false });
const np = await nojs.newPage();
await np.goto(base + '/stafi');
ok('no-JS: staff list fully rendered', (await np.locator('[data-person]').count()) >= 22);
await np.goto(base + '/oraret');
ok('no-JS: bell schedule visible', (await np.locator('#zilja').innerText()).includes('07:30–08:15'));
await np.goto(base + '/lajme');
ok('no-JS: news archive shows all 3 cards', (await np.locator('[data-news]:visible').count()) === 3);

await browser.close();
const fails = results.filter((r) => !r[0]);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
