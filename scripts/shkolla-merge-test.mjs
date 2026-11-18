import { chromium } from 'playwright';
const base = process.argv[2]; const ip = process.env.PUBLIC_CHECK_IP;
const b = await chromium.launch(ip ? { args: [`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`] } : {});
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
for (const w of [390, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 700, hasTouch: w < 700 });
  const p = await c.newPage();
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  if (w < 700) await p.locator('#nav-toggle').tap();
  ok((await p.locator('#primary-nav .nav-list a').allInnerTexts()).join('|') === 'Ballina|Stafi|Jeta shkollore|Për prindërit', `${w}px: four tabs, no Shkolla`);
  if (w < 700) await p.locator('#nav-toggle').tap();
  ok((await p.locator('#shkolla').count()) === 1, `${w}px: one #shkolla section`);
  ok((await p.locator('#shkolla h2').allInnerTexts()).join('|') === 'Identiteti i shkollës|Shkallët e arsimit|Mitrush Kuteli, shkrimtari', `${w}px: identity, stages and Mitrush Kuteli present, no duplicates`);
  ok(await p.evaluate(() => { const o = [...document.querySelectorAll('main > section, main > div > section, main section')].map((s) => s.id || s.getAttribute('aria-labelledby')); return o.indexOf('life-h') < o.indexOf('staff-h') && o.indexOf('staff-h') < o.indexOf('id-h'); }), `${w}px: school content sits below the existing sections`);
  await p.locator('.hero-actions a', { hasText: 'Njihuni me shkollën' }).click(); await p.waitForTimeout(1800);
  const top = await p.evaluate(() => document.getElementById('shkolla').getBoundingClientRect().top);
  ok(top >= 0 && top < 200, `${w}px: hero button scrolls to #shkolla (top ${Math.round(top)}px)`);
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, `${w}px: no horizontal overflow`);
  const r = await p.goto(base + '/shkolla', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  ok(new URL(p.url()).pathname === '/' && new URL(p.url()).hash === '#shkolla', `${w}px: /shkolla redirects to /#shkolla (${p.url().replace(base, '')})`);
  await c.close();
}
await b.close(); console.log(fail ? 'SHKOLLA MERGE FAIL ' + fail : 'SHKOLLA MERGE OK'); process.exit(fail ? 1 : 0);
