// Audit the built output for private material: node scripts/audit-dist.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const walk = (d) => !fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const dist = walk('dist');
const problems = [];

// 1. Private sources by exact hash (anything copied verbatim into dist)
const publicOk = new Set(['foto-1.jpg', 'foto-2.jpg', 'foto-3.jpg', 'foto-4.jpg', 'foto-5.jpg', 'mitrush-kuteli.jpg', 'image(20261116-084223).png', 'image(20261116-084243).png', 'image(20261116-084247).png']);
const pk = 'package/Mitrush_Kuteli_Professional_Photos';
const pkgFiles = fs.existsSync(pk) ? [...walk(pk + '/originals'), ...walk(pk + '/all-photos').filter((f) => /photo-b2-/.test(f))] : [];
const privateFiles = [...walk('sources'), ...walk('archive'), ...walk('data'), ...pkgFiles].filter((f) => !publicOk.has(path.basename(f)) && !f.endsWith('.zip') && !f.endsWith('.md'));
const privHash = new Map(privateFiles.map((f) => [sha(f), f]));
const distHash = new Map(dist.map((f) => [sha(f), f]));
for (const [h, f] of privHash) if (distHash.has(h)) problems.push(`private file copied verbatim: ${f} -> ${distHash.get(h)}`);

// 2. Derived images: perceptual check of every raster in dist against private image sources
async function thumb(buf) { return sharp(buf).resize(16, 16, { fit: 'fill' }).greyscale().raw().toBuffer(); }
const privImgs = privateFiles.filter((f) => /\.(jpe?g|png)$/i.test(f));
const privThumbs = [];
for (const f of privImgs) privThumbs.push([f, await thumb(f)]);
const distImgs = dist.filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
for (const f of distImgs) {
  const t = await thumb(f).catch(() => null);
  if (!t) continue;
  for (const [pf, pt] of privThumbs) {
    let diff = 0;
    for (let i = 0; i < t.length; i++) diff += Math.abs(t[i] - pt[i]);
    if (diff / t.length < 6) problems.push(`image resembles private source: ${f} ~ ${pf} (mean diff ${(diff / t.length).toFixed(1)})`);
  }
}

// 3. Names and strings
const badNames = /photo-b2|originals|Mitrush_Kuteli_Professional|viber|handwrit|untitled|school-data|\.seed|prototype|084307|084324|mitrushkuteli\.html|faqjaeshkolles|archive|sources/i;
for (const f of dist) if (badNames.test(f.replace(/\\/g, '/'))) problems.push(`suspicious path in dist: ${f}`);
const textFiles = dist.filter((f) => /\.(html|js|css|json|txt|xml|svg|map)$/i.test(f));
const badText = /photo-b2|photo-name-mapping|Ekrem|Isa Avdiu|Alfeta|viber_image|school-data|handwritten|sources\/(assets|documents)|CONTENT_REVIEW|unassigned/i;
for (const f of textFiles) { const t = fs.readFileSync(f, 'utf8'); const m = t.match(badText); if (m) problems.push(`private string "${m[0]}" in ${f}`); }

// 4. Inventory
const exts = {};
for (const f of dist) exts[path.extname(f)] = (exts[path.extname(f)] || 0) + 1;
console.log('dist files by type:', JSON.stringify(exts));
console.log('non-hashed top-level + documents:', dist.filter((f) => !f.includes('_astro') && !f.endsWith('index.html')).map((f) => f.replace(/\\/g, '/')).join(', '));
const astroImgs = [...new Set(distImgs.filter((f) => f.includes('_astro')).map((f) => path.basename(f).split('.')[0]))];
console.log('image origins in _astro:', astroImgs.join(', '));
console.log(`compared ${distImgs.length} dist images against ${privImgs.length} private images`);
if (problems.length) { console.log('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
console.log('AUDIT OK: no private material found in dist/');
