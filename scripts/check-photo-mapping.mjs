// Fails when src/data/photo-name-mapping.json and staff.json disagree, or a mapped web file is missing.
import { readFileSync, existsSync } from 'node:fs';
const map = JSON.parse(readFileSync('src/data/photo-name-mapping.json', 'utf8'));
const staffRaw = JSON.parse(readFileSync('src/data/staff.json', 'utf8'));
const staff = Array.isArray(staffRaw) ? staffRaw : staffRaw.staff;
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };
const ids = new Set(staff.map((m) => m.id));
const seenPerson = new Set(), seenPhoto = new Set();
for (const r of map.resolved) {
  if (!ids.has(r.personId)) fail(`unknown person ${r.personId}`);
  if (seenPerson.has(r.personId)) fail(`person mapped twice: ${r.personId}`);
  if (seenPhoto.has(r.photoId)) fail(`photo mapped twice: ${r.photoId}`);
  seenPerson.add(r.personId); seenPhoto.add(r.photoId);
  if (!existsSync(r.webFile)) fail(`missing web file ${r.webFile}`);
  const m = staff.find((s) => s.id === r.personId);
  if (m && m.portrait?.file !== r.photoId) fail(`staff.json portrait for ${r.personId} is ${m?.portrait?.file}, mapping says ${r.photoId}`);
}
for (const m of staff) if (m.portrait?.approved && !seenPerson.has(m.id)) fail(`${m.id} has a portrait in staff.json that is not in the mapping file`);
for (const u of map.unassigned) if (seenPhoto.has(u.photoId)) fail(`${u.photoId} is both resolved and unassigned`);
console.log(bad ? `PHOTO MAPPING FAILURES: ${bad}` : `PHOTO MAPPING OK: ${map.resolved.length} resolved, ${map.unassigned.length} unassigned (unpublished), ${map.staffWithoutPhoto.length} people without a photo`);
process.exit(bad ? 1 : 0);
