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

// Framing only (no retouching): zoom z>1 crops a sub-rectangle of the edited source, centred on the face (cx) with the crown
// near the top (crown, as a fraction of source height). Measured on a gridded contact sheet; z is limited so the crop is never upscaled.
const FRAME = {
  'sebahate-gashi': { z: 1.1, cx: 0.5, crown: 0.06 },
  'hasime-mehmeti': { z: 1.2, cx: 0.52, crown: 0.03 },
  'hikmete-limani': { z: 1.15, cx: 0.5, crown: 0.07 },
  'leonarda-berisha': { z: 1.3, cx: 0.5, crown: 0.06 },
  'remzije-racaj': { z: 1.5, cx: 0.47, crown: 0.04 },
  'donjeta-rrashiti': { z: 1.5, cx: 0.5, crown: 0.06 },
};
const chosen = manifest.entries.filter((e) => e.mappingStatus === 'owner_captioned');
const report = [];
for (const e of chosen) {
  const src = path.join(pkg, e.editedFile);
  const dest = path.join(out, `${e.imageId}.webp`);
  const isTeam = e.kind !== 'staff';
  if (isTeam) {
    await sharp(src).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 84 }).toFile(dest);
  } else {
    const meta0 = await sharp(src).metadata();
    const f = FRAME[e.imageId] ?? { z: 1, cx: 0.5, crown: 0 };
    const w = Math.round(meta0.width / f.z), h = Math.round(meta0.height / f.z);
    const left = Math.max(0, Math.min(meta0.width - w, Math.round(f.cx * meta0.width - w / 2)));
    const top = Math.max(0, Math.min(meta0.height - h, Math.round(f.crown * meta0.height - 0.06 * h)));
    await sharp(src).rotate().extract({ left, top, width: w, height: h }).resize(720, 900, { fit: 'cover' }).webp({ quality: 84 }).toFile(dest);
  }
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
