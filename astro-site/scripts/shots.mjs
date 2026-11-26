// Development screenshots: node scripts/shots.mjs http://localhost:4331 work/shots
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:4331';
const out = process.argv[3] || 'work/shots';
const browser = await chromium.launch();
const jobs = [
  ['home', '/', [1280, 390]], ['staff', '/stafi', [1280, 390]], ['schedule-bells', '/oraret', [1280, 390]], ['schedule-classes', '/oraret#klasat', [1280, 390]],
  ['consultations', '/konsultimet', [1280, 390]], ['gallery', '/galeria', [1280, 390]], ['news', '/lajme', [1280, 390]], ['article', '/lajme/bashkepunim-per-cilesi-ne-mesimdhenie', [1280, 390]],
  ['clubs', '/klubet', [1280, 390]], ['activities', '/aktivitete', [1280, 390]], ['documents', '/dokumente', [1280, 390]], ['contact', '/kontakti', [1280, 390]],
  ['parents', '/per-prinder', [1280, 390]], ['festive', '/festat/28-nentori', [1280, 390]],
];
for (const [name, path, widths] of jobs) {
  for (const w of widths) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: true });
    await p.close();
  }
}
await browser.close();
console.log('done');
