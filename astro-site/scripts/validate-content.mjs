// Content sanity checks: node scripts/validate-content.mjs
import fs from 'node:fs';
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const staff = read('src/data/staff.json');
const cons = read('src/data/consultations.json');
const photos = read('src/data/photos.json');
const docs = read('src/data/documents.json');
const ids = new Set(staff.map((s) => s.id));
const problems = [];
const bad = (m) => problems.push(m);

if (ids.size !== staff.length) bad('duplicate staff ids');
for (const c of cons) {
  if (!ids.has(c.staffId)) bad(`consultation ${c.id}: unknown staff ${c.staffId}`);
  if (!/^\d\d:\d\d$/.test(c.start) || !/^\d\d:\d\d$/.test(c.end) || c.start >= c.end) bad(`consultation ${c.id}: bad times`);
  if (!c.weekdays.every((d) => d >= 1 && d <= 5)) bad(`consultation ${c.id}: bad weekday`);
}
const usedPortraits = new Map();
for (const s of staff) {
  if (!s.portrait) continue;
  if (!fs.existsSync(`src/assets/staff/${s.portrait.file}.webp`)) bad(`${s.id}: portrait file src/assets/staff/${s.portrait.file}.webp missing`);
  if (usedPortraits.has(s.portrait.file)) bad(`portrait ${s.portrait.file} assigned to both ${usedPortraits.get(s.portrait.file)} and ${s.id}`);
  usedPortraits.set(s.portrait.file, s.id);
  if (/photo-b2/.test(s.portrait.file)) bad(`${s.id}: unmapped second-batch portrait must not be published`);
}
const names = new Map();
for (const s of staff) for (const n of [s.displayName, ...s.aliases]) { const k = n.toLowerCase(); if (names.has(k) && names.get(k) !== s.id) bad(`name/alias "${n}" used by ${names.get(k)} and ${s.id}`); names.set(k, s.id); }
for (const p of photos.photos) if (!fs.existsSync(`src/assets/photos/${p.id}.jpg`) && !fs.existsSync(`src/assets/staff/${p.id}.webp`)) bad(`photo missing: ${p.id}`);
for (const c of read('src/data/clubs.json').clubs) if (c.photo && !photos.photos.some((p) => p.id === c.photo)) bad(`club ${c.id}: photo ${c.photo} not in photos.json`);
for (const d of docs) if (!d.external && !fs.existsSync('public' + d.file)) bad(`document file missing: ${d.file}`);

const rows = fs.readFileSync('src/data/timetable-matrix.txt', 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
const seen = new Map();
for (const r of rows) {
  const [n, id, ...days] = r.split('|');
  if (!ids.has(id)) bad(`timetable row ${n}: unknown staff ${id}`);
  if (days.length !== 5) bad(`timetable row ${n}: need 5 days`);
  days.forEach((d, di) => {
    const cells = d.trim().split(/\s+/);
    if (cells.length !== 6) bad(`timetable row ${n} day ${di + 1}: need 6 cells`);
    cells.forEach((c, pi) => {
      if (c === '_' || c === '?') return;
      if (!/^[6-9]\.[1-3]$/.test(c)) bad(`timetable row ${n}: odd class "${c}"`);
      const k = `${c} day${di + 1} p${pi + 1}`;
      if (seen.has(k)) console.log(`NOTE: ${k} is assigned to both ${seen.get(k)} and ${id} (flagged on the site)`);
      seen.set(k, id);
    });
  });
}
for (const f of fs.readdirSync('src/news')) {
  const t = fs.readFileSync('src/news/' + f, 'utf8');
  for (const key of ['title:', 'summary:', 'category:', 'publishedAt:', 'status:', 'sources:']) if (!t.includes(key)) bad(`${f}: missing ${key}`);
}
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log(`Content OK: ${staff.length} staff, ${cons.length} consultations, ${rows.length} timetable rows, ${fs.readdirSync('src/news').length} news items.`);
