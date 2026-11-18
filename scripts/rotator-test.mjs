import { chromium } from 'playwright';
const base = process.argv[2];
const b = await chromium.launch();
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
for (const mobile of [true, false]) {
  const c = await b.newContext({ viewport: { width: mobile ? 390 : 1440, height: 800 }, isMobile: mobile, hasTouch: mobile });
  const p = await c.newPage();
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const h0 = (await p.locator('.rot-stage').boundingBox()).height;
  const act = () => p.evaluate(() => [...document.querySelectorAll('[data-slide]')].findIndex((s) => s.classList.contains('active')));
  ok((await act()) === 0, 'starts at slide 1');
  await p.waitForTimeout(6600);
  ok((await act()) === 1, (mobile ? 'mobile' : 'desktop') + ': auto-advances after ~6s');
  const heights = new Set();
  for (let i = 0; i < 4; i++) { await p.locator('#rot-next').click(); heights.add(Math.round((await p.locator('.rot-stage').boundingBox()).height)); }
  ok(heights.size === 1 && heights.has(Math.round(h0)), 'section height never changes (' + [...heights] + ' vs ' + Math.round(h0) + ')');
  await p.locator('#rot-pause').click();
  ok((await p.locator('#rot-pause').innerText()) === 'Vazhdo', 'pause button reads Vazhdo');
  const a = await act(); await p.waitForTimeout(6600);
  ok((await act()) === a, 'no auto-advance while paused');
  await p.locator('#rot-pause').click();
  await p.locator('.rot-stage').focus(); await p.keyboard.press('ArrowRight');
  ok((await act()) === (a + 1) % 4, 'ArrowRight moves to next');
  await p.keyboard.press('ArrowLeft');
  ok((await act()) === a, 'ArrowLeft moves back');
  await p.locator('[data-dot="3"]').click();
  ok((await act()) === 3, 'dot jumps to slide 4');
  ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'no horizontal overflow');
  if (mobile) {
    const box = await p.locator('.rot-stage').boundingBox();
    await p.evaluate(() => { const st = document.getElementById('rot-stage'); const mk = (t, x) => new TouchEvent(t, { bubbles: true, cancelable: true, touches: t === 'touchend' ? [] : [new Touch({ identifier: 1, target: st, clientX: x, clientY: 300 })], changedTouches: [new Touch({ identifier: 1, target: st, clientX: x, clientY: 300 })] }); st.dispatchEvent(mk('touchstart', 300)); st.dispatchEvent(mk('touchend', 120)); });
    ok((await act()) === 0, 'swipe left goes to next (wraps to 1)');
  }
  await c.close();
}
const c2 = await b.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' });
const p2 = await c2.newPage(); await p2.goto(base + '/', { waitUntil: 'networkidle' }); await p2.waitForTimeout(6800);
ok((await p2.evaluate(() => document.querySelector('[data-slide].active') === document.querySelector('[data-slide]'))) && (await p2.locator('#rot-pause').innerText()) === 'Vazhdo', 'reduced motion: no auto-advance, shows Vazhdo');
await b.close(); console.log(fail ? 'ROTATOR FAIL ' + fail : 'ROTATOR OK'); process.exit(fail ? 1 : 0);
