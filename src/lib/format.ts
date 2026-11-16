export const WEEKDAYS: Record<number, string> = {
  1: 'E hënë',
  2: 'E martë',
  3: 'E mërkurë',
  4: 'E enjte',
  5: 'E premte',
};

export const MONTHS = [
  'janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor',
  'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor',
];

/** "2026-06-12" -> "12 qershor 2026" (no timezone arithmetic, so no off-by-one). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateList(isos: string[]): string {
  if (isos.length === 2) {
    const [a, b] = isos.map((s) => s.split('-').map(Number));
    if (a[0] === b[0] && a[1] === b[1]) return `${a[2]}–${b[2]} ${MONTHS[a[1] - 1]} ${a[0]}`;
  }
  return isos.map(formatDate).join(', ');
}

export function timeRange(start: string, end: string): string {
  return `${start}–${end}`;
}

export function weekdayList(days: number[]): string {
  if (days.length === 5 && days.every((d, i) => d === i + 1)) return 'Çdo ditë pune';
  const names = days.map((d) => WEEKDAYS[d]);
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' dhe ' + names[names.length - 1].replace(/^E /, 'e ');
}

/** Lowercase, strip diacritics (ë→e, ç→c) so "Shkelzen" finds "Shkëlzen". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c');
}

export function initials(name: string): string {
  const parts = name.replace(/[“”"]/g, '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function gapMinutes(endA: string, startB: string): number {
  return toMinutes(startB) - toMinutes(endA);
}

const ROMAN: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX' };

/** "7.2" -> "VII-2" */
export function classId(raw: string): string {
  const [g, s] = raw.split('.');
  return `${ROMAN[g] ?? g}-${s}`;
}
