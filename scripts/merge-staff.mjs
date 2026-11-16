// One-off, documented merge of the owner's staff package into src/data/staff.json.
// node scripts/merge-staff.mjs [package-dir]
// Rules (from the package): keep stable IDs; null = not supplied (never erases); aliases are unions; no invented roles/subjects.
import fs from 'node:fs';
import path from 'node:path';

const pkg = process.argv[2] || 'package/Mitrush_Kuteli_Professional_Photos';
const dir = JSON.parse(fs.readFileSync(path.join(pkg, 'data/staff-directory.json'), 'utf8'));
const file = 'src/data/staff.json';
const staff = JSON.parse(fs.readFileSync(file, 'utf8'));
fs.mkdirSync('work', { recursive: true });
fs.writeFileSync('work/staff.before-merge.json', JSON.stringify(staff, null, 2));
const byId = new Map(staff.map((s) => [s.id, s]));

const groupFor = (label) => {
  if (!label) return 'other';
  if (/asistent|psikolog|mbështet/i.test(label)) return 'support';
  if (/drejtor|sekretar|koordinator/i.test(label)) return 'leadership';
  return 'teaching';
};
const union = (...lists) => [...new Set(lists.flat().filter(Boolean))];
const log = [];

for (const p of dir.people) {
  const imageId = p.portrait ? path.basename(p.portrait).replace(/\.png$/, '') : null;
  const portrait = imageId
    ? { file: imageId, mapping: 'Lidhje e konfirmuar nga pronari (emër i shkruar te fotoja)', approved: true }
    : null;
  const primaryRole = p.roles?.[0] ?? null;
  const cur = byId.get(p.id);
  if (!cur) {
    const m = {
      id: p.id,
      displayName: p.displayName,
      aliases: union(p.aliases),
      subjects: union(p.subjects),
      roles: [{ label: primaryRole || 'Pozicioni nuk është specifikuar', group: groupFor(primaryRole) }],
      source: 'owner-captions-2026-11-16',
      portrait,
    };
    if (p.educationStage) m.stage = p.educationStage;
    staff.push(m);
    byId.set(m.id, m);
    log.push(`NEW  ${m.id} (${m.roles[0].label}) portrait=${imageId ?? '-'}`);
    continue;
  }
  const before = cur.displayName;
  cur.aliases = union(cur.aliases, p.aliases, before !== p.displayName ? [before] : []).filter((a) => a !== p.displayName);
  cur.displayName = p.displayName;
  cur.subjects = union(cur.subjects, p.subjects);
  if (cur.roles.length === 1 && primaryRole && primaryRole !== cur.roles[0].label) cur.roles[0].label = primaryRole;
  if (p.educationStage) cur.stage = p.educationStage;
  if (portrait) cur.portrait = portrait; // null never erases an existing mapping
  else if (cur.portrait && !cur.portrait.approved) cur.portrait = null; // old unapproved legacy file reference is not published
  log.push(`MERGE ${cur.id}: "${before}" -> "${cur.displayName}" aliases=[${cur.aliases.join(', ')}] portrait=${cur.portrait?.file ?? '-'}`);
}
fs.writeFileSync(file, JSON.stringify(staff, null, 2) + '\n');
console.log(log.join('\n'));
console.log(`\n${staff.length} person records; ${staff.filter((s) => s.portrait).length} with a published portrait.`);
