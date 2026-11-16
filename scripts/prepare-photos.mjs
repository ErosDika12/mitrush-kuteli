// Creates web masters for the owner-captioned photos from the private package.
// node scripts/prepare-photos.mjs [package-dir]
// Reads only data and images. Output: src/assets/staff/*.webp (no EXIF) and work/compare.jpg (edited vs original).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const pkg = process.argv[2] || 'package/Mitrush_Kuteli_Professional_Photos';
const manifest = JSON.parse(fs.readFileSync(path.join(pkg, 'photo-manifest.json'), 'utf8'));
const out = 'src/assets/staff';
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync('work', { recursive: true });

const chosen = manifest.entries.filter((e) => e.mappingStatus === 'owner_captioned');
const report = [];
for (const e of chosen) {
  const src = path.join(pkg, e.editedFile);
  const dest = path.join(out, `${e.imageId}.webp`);
  const isTeam = e.kind !== 'staff';
  await sharp(src).rotate().resize({ width: isTeam ? 1400 : 900, withoutEnlargement: true }).webp({ quality: 84 }).toFile(dest);
  const meta = await sharp(dest).metadata();
  report.push(`${e.imageId} ${meta.width}x${meta.height} ${(fs.statSync(dest).size / 1024).toFixed(0)}KB`);
}
console.log(report.join('\n'));

// Contact sheet: edited (left) vs original (right) for each staff portrait, to check likeness before publishing.
const staff = chosen.filter((e) => e.kind === 'staff');
const cellW = 200, cellH = 250;
const cells = [];
for (const e of staff) {
  const a = await sharp(path.join(pkg, e.editedFile)).resize(cellW, cellH, { fit: 'cover', position: 'top' }).toBuffer();
  const b = await sharp(path.join(pkg, e.originalFile)).resize(cellW, cellH, { fit: 'cover', position: 'top' }).toBuffer();
  cells.push({ a, b, name: e.displayName });
}
const cols = 4;
const rows = Math.ceil(cells.length / cols);
const tileW = cellW * 2 + 12, tileH = cellH + 8;
const comps = [];
cells.forEach((c, i) => {
  const x = (i % cols) * tileW, y = Math.floor(i / cols) * tileH;
  comps.push({ input: c.a, left: x, top: y }, { input: c.b, left: x + cellW + 2, top: y });
});
await sharp({ create: { width: cols * tileW, height: rows * tileH, channels: 3, background: '#ffffff' } }).composite(comps).jpeg({ quality: 80 }).toFile('work/compare.jpg');
console.log('order (row-major, edited|original):', cells.map((c) => c.name).join(', '));
