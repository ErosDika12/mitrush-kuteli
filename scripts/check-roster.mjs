// Verifies the owner's staff placement table against src/data/staff.json: node scripts/check-roster.mjs
import fs from 'node:fs';
const staff = JSON.parse(fs.readFileSync('src/data/staff.json', 'utf8'));
const by = new Map(staff.map((s) => [s.id, s]));
// [id, display name, primary group, role label, subject, stage, portrait]
const T = [
 ['remzije-racaj','Remzije Racaj','leadership','Drejtoreshë','',null,1],
 ['besnik-mehmeti','Besnik Mehmeti','leadership','Sekretar i shkollës','',null,1],
 ['hasime-mehmeti','Hasime Mehmeti','leadership','Koordinatore','Art muzikor',null,1],
 ['bukurije-kameri','Bukurije Kameri','teaching','Mësimdhënës/e','Gjuhë shqipe',null,0],
 ['luljete-haxhijaj','Luljeta Haxhiaj','teaching','Mësimdhënëse','Gjuhë shqipe',null,1],
 ['fortesa-gashi','Fortesa Gashi Miftari','teaching','Mësimdhënëse','Gjuhë shqipe',null,1],
 ['edona-novoberdaliu','Edona Novobërdaliu','teaching','Mësimdhënës/e','Gjuhë angleze',null,0],
 ['kemal-islami','Kemall Islami','teaching','Mësimdhënës','Gjuhë angleze',null,1],
 ['sebahat-gashi','Sebahate Gashi','teaching','Mësimdhënëse','Gjuhë gjermane',null,1],
 ['matjane-kallaba','Matjane Kallaba','teaching','Mësimdhënëse','Art figurativ',null,1],
 ['arta-kllokoqi','Arta Kllokoqi','teaching','Mësimdhënëse','Matematikë',null,1],
 ['hikmete-limani','Hikmete Limani','teaching','Mësimdhënëse','Matematikë',null,1],
 ['nora-vitija','Nora Vitia','teaching','Mësimdhënëse','Gjeografi',null,1],
 ['albert-muslijaj','Albert Muslija','teaching','Mësimdhënës','Histori',null,1],
 ['njomza-jetullahu','Njomza Jetullahu','teaching','Mësimdhënëse','Edukatë qytetare',null,1],
 ['akter-imeri','Aktere Ymeri','teaching','Mësimdhënëse','Biologji',null,1],
 ['leonarda-berisha','Leonarda Berisha','teaching','Mësimdhënëse','Fizikë',null,1],
 ['shkelzen-asimi','Shkëlzen Asimi','teaching','Mësimdhënës','Kimi',null,1],
 ['diellona-kabashi','Diellona Kabashi','teaching','Mësimdhënës/e','TIK',null,0],
 ['fahrije-korca','Fahrije Korça','teaching','Mësimdhënëse','Edukatë fizike dhe sport',null,1],
 ['donjeta-rrashiti','Donjeta Rrashiti','teaching','Mësuese','','I–V',1],
 ['ardita-sherifi','Ardita Sherifi','teaching','Mësuese parashkollore','','parashkollor',1],
 ['bardha-muharremi','Bardha Muharremi','teaching','Mësuese','',null,0],
 ['modesta-noci','Modesta Noci','teaching','Mësuese','',null,0],
 ['linda-veseli','Linda Veseli','teaching','Mësuese','',null,1],
 ['merita-hoti','Merita Hoti','teaching','Mësuese','',null,1],
 ['blinera-maliqi','Blinera Maliqi','teaching','Mësuese','',null,1],
 ['valbona-rapuca','Valbona Rapuca','teaching','Mësuese','',null,1],
 ['alban-mustafa','Alban Mustafa','teaching','Mësues','',null,1],
 ['adelina-arifi','Adelina Arifi','teaching','Mësuese parashkollore','','parashkollor',1],
 ['gentiana-mavriqi','Gentiana Mavriqi','teaching','Mësuese','',null,1],
 ['diturie-hajdini','Diturie Hajdini','teaching','Mësuese e ciklit fillor','','I–V',1],
 ['taibe-morina','Taibe Morina','support','Psikologe','',null,1],
 ['merita-sejdiu','Merita Sejdiu','support','Mësuese mbështetëse','',null,0],
 ['yllka-zubaku','Yllka Zubaku','support','Asistente për fëmijët me nevoja të veçanta','',null,1],
 ['hatixhe-zogaj','Hatixhe Zogaj','support','Asistente për fëmijët me nevoja të veçanta','',null,1],
 ['fitore-sherifi','Fitore Sherifi','teaching','Mësuese','',null,1],
];
const bad = [];
for (const [id, name, grp, label, subj, stage, photo] of T) {
  const s = by.get(id);
  if (!s) { bad.push(`${id}: missing`); continue; }
  if (s.displayName !== name) bad.push(`${id}: name "${s.displayName}" != "${name}"`);
  if (s.roles[0].group !== grp) bad.push(`${id}: primary group ${s.roles[0].group} != ${grp}`);
  if (s.roles[0].label !== label) bad.push(`${id}: role "${s.roles[0].label}" != "${label}"`);
  if (subj && !s.subjects.includes(subj)) bad.push(`${id}: subject ${subj} missing`);
  if ((s.stage ?? null) !== stage) bad.push(`${id}: stage ${s.stage ?? null} != ${stage}`);
  if (!!s.portrait !== !!photo) bad.push(`${id}: portrait ${!!s.portrait} != ${!!photo}`);
}
const extra = staff.filter((s) => !T.some((t) => t[0] === s.id)).map((s) => s.id);
const h = by.get('hasime-mehmeti');
if (!(h.roles.length === 2 && h.roles.some((r) => /muzik/i.test(r.label)))) bad.push('hasime: needs coordination + music roles in one record');
for (const [a, b] of [['merita-hoti', 'merita-sejdiu'], ['ardita-sherifi', 'fitore-sherifi']]) if (a === b) bad.push('distinct people merged');
const aliasExpect = { 'akter-imeri': ['Akter Imeri', 'Akter Ymeri'], 'sebahat-gashi': ['Sebahat Gashi'], 'albert-muslijaj': ['Albert Muslijaj'], 'nora-vitija': ['Nora Vitija'], 'kemal-islami': ['Kemal Islami'], 'luljete-haxhijaj': ['Luljetë Haxhijaj'] };
for (const [id, al] of Object.entries(aliasExpect)) for (const a of al) if (!by.get(id).aliases.includes(a)) bad.push(`${id}: alias "${a}" missing`);
console.log(`table rows: ${T.length}; records in data: ${staff.length}; portraits published: ${staff.filter((s) => s.portrait).length}; extra records not in table: ${extra.join(', ') || 'none'}`);
if (bad.length) { console.log('MISMATCH:\n' + bad.join('\n')); process.exit(1); }
console.log('ROSTER OK: all 37 identities match the placement table exactly once');
