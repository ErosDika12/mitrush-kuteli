// Writes src/data/photo-name-mapping.json (the single authoritative photo <-> person file) from staff.json and the
// private photo-package manifest, and updates the obsolete "pending" flags in the package metadata for the
// portraits that the owner has confirmed. Photographs whose owner assignment is still missing stay "unassigned".
// node scripts/build-photo-mapping.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const pkg = 'package/Mitrush_Kuteli_Professional_Photos';
const staffRaw = JSON.parse(readFileSync('src/data/staff.json', 'utf8'));
const staff = Array.isArray(staffRaw) ? staffRaw : staffRaw.staff;
const manifestPath = `${pkg}/photo-manifest.json`;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { entries: [] };
const byImage = new Map(manifest.entries.map((e) => [e.imageId, e]));

const resolved = staff.filter((m) => m.portrait?.approved).map((m) => {
  const e = byImage.get(m.portrait.file);
  return {
    personId: m.id,
    displayName: m.displayName,
    photoId: m.portrait.file,
    webFile: `src/assets/staff/${m.portrait.file}.webp`,
    packageEditedFile: e?.editedFile ?? null,
    packageOriginalFile: e?.originalFile ?? null,
    basis: 'owner_captioned (name supplied by the owner with the photograph)',
    status: 'resolved',
  };
});
const pending = manifest.entries.filter((e) => e.kind === 'staff' && e.mappingStatus === 'pending_owner_confirmation').map((e) => ({
  photoId: e.imageId,
  packageEditedFile: e.editedFile,
  packageOriginalFile: e.originalFile,
  sourceSequence: e.sourceSequence,
  status: 'unassigned',
  published: false,
}));
const withPhoto = new Set(resolved.map((r) => r.personId));
const out = {
  authoritative: true,
  generatedBy: 'scripts/build-photo-mapping.mjs',
  note: 'Only explicit owner assignments are listed as resolved. The unassigned files have no owner-supplied name; their pairing is not inferred from faces, gender, sequence or position. Add their assignments here (photoId -> personId) and re-run the mapping build.',
  resolved,
  unassigned: pending,
  staffWithoutPhoto: staff.filter((m) => !withPhoto.has(m.id)).map((m) => ({ personId: m.id, displayName: m.displayName })),
};
writeFileSync('src/data/photo-name-mapping.json', JSON.stringify(out, null, 2) + '\n');

// Update obsolete metadata in the private package for the confirmed portraits.
let updated = 0;
for (const r of resolved) {
  const e = byImage.get(r.photoId);
  if (e) { e.mappingStatus = 'owner_confirmed'; e.displayName = r.displayName; e.personId = r.personId; updated++; }
  const p = `${pkg}/photo-details/${r.photoId}.json`;
  if (existsSync(p)) {
    const d = JSON.parse(readFileSync(p, 'utf8'));
    d.personId = r.personId; d.displayName = r.displayName; d.mappingStatus = 'owner_confirmed';
    d.publicUse = 'published_on_website'; d.instruction = 'Resolved. See src/data/photo-name-mapping.json (authoritative).';
    writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  }
}
manifest.confirmedStaffAssociations = resolved.length;
manifest.pendingStaffAssociations = pending.length;
manifest.authoritativeMapping = 'src/data/photo-name-mapping.json';
if (existsSync(manifestPath)) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`resolved ${resolved.length}, unassigned ${pending.length}, people without photo ${out.staffWithoutPhoto.length}; package entries updated ${updated}`);
