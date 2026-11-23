import school from '../data/school.json';
import staffRaw from '../data/staff.json';
import consultationsRaw from '../data/consultations.json';
import bells from '../data/bells.json';
import history from '../data/history.json';
import documentsRaw from '../data/documents.json';
import activities from '../data/activities.json';
import photosData from '../data/photos.json';
import faq from '../data/faq.json';
import clubsData from '../data/clubs.json';
import { formatDate, normalize } from './format';

export { school, bells, history, activities, faq, photosData, clubsData };

export type RoleGroup = 'leadership' | 'teaching' | 'support' | 'other';

export interface Role { label: string; group: RoleGroup }
export interface StaffMember {
  id: string;
  displayName: string;
  aliases: string[];
  subjects: string[];
  roles: Role[];
  stage?: string;
  portrait: { file: string; mapping: string; approved: boolean } | null;
}
export interface Consultation {
  id: string;
  staffId: string;
  context: 'teaching' | 'support' | 'administration' | 'coordination' | 'psychology';
  weekdays: number[];
  start: string;
  end: string;
  schoolYear: string;
}

export const staff = staffRaw as StaffMember[];
export const consultations = consultationsRaw as Consultation[];
export const staffById = new Map(staff.map((s) => [s.id, s]));

export const GROUP_LABELS: Record<RoleGroup, string> = {
  leadership: 'Udhëheqja dhe administrata',
  teaching: 'Mësimdhënës',
  support: 'Shërbime mbështetëse',
  other: 'Pjesë tjetër e stafit',
};

export const CONTEXT_LABELS: Record<Consultation['context'], string> = {
  teaching: 'Konsultim lëndor',
  support: 'Mbështetje',
  administration: 'Administratë',
  coordination: 'Koordinim',
  psychology: 'Psikologji',
};

export interface Document {
  id: string; title: string; originalTitle: string; category: string; schoolYear: string;
  date: string | null; format: string; file: string; description: string;
  transcription: string | null; status: string; external?: boolean;
}
export const documents = (documentsRaw as Document[]).filter((d) => d.status === 'published');

/* ---------- News ---------- */
export interface NewsItem {
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  eventDates?: string[];
  eventDate?: string;
  image?: string;
  sourceKind: string;
  sources: { name: string; url: string; note?: string }[];
  Content: any;
}

const modules = import.meta.glob('../news/*.md', { eager: true }) as Record<string, any>;

export const news: NewsItem[] = Object.entries(modules)
  .map(([path, mod]) => {
    const fm = mod.frontmatter ?? {};
    return {
      slug: path.split('/').pop()!.replace(/\.md$/, ''),
      title: fm.title,
      summary: fm.summary,
      category: fm.category,
      publishedAt: String(fm.publishedAt).slice(0, 10),
      eventDates: fm.eventDates?.map((d: any) => String(d).slice(0, 10)),
      eventDate: fm.eventDate ? String(fm.eventDate).slice(0, 10) : undefined,
      image: fm.image,
      sourceKind: fm.sourceKind ?? 'Lajm',
      sources: fm.sources ?? [],
      status: fm.status,
      Content: mod.Content,
    } as NewsItem & { status: string };
  })
  .filter((n: any) => n.status === 'published')
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export const newsCategories = [...new Set(news.map((n) => n.category))].sort((a, b) => a.localeCompare(b, 'sq'));

/* ---------- Search index (only published content) ---------- */
export interface SearchEntry { type: string; title: string; text: string; url: string; keys: string }

export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const pages: [string, string, string][] = [
    ['Ballina', '/', 'Shkolla Fillore dhe e Mesme e Ulët Mitrush Kuteli Matiqan Prishtinë'],
    ['Rreth shkollës', '/#shkolla', 'histori identitet vlera shkallët e arsimit Mitrush Kuteli shkrimtari'],
    ['Stafi', '/stafi', 'mësimdhënës drejtoria administrata psikologe sekretar koordinatore'],
    ['Lajme', '/lajme', 'lajme njoftime arkiv'],
    ['Jeta shkollore', '/aktivitete', 'muzikë kor sport futboll aktivitete në natyrë'],
    ['Galeria', '/galeria', 'fotografi albume'],
    ['Orari & konsultimet', '/oraret', 'orari i ziles ndërrimi i parë i dytë parafillor orari mësimor klasat'],
    ['Për prindërit', '/per-prinder', 'prindër informacion pyetje të shpeshta'],
    ['Konsultimet me prindër', '/konsultimet', 'takime individuale mësimdhënës ditët orët'],
    ['Dokumentet', '/dokumente', 'dokumente orare shkarkim'],
    ['Kontakti', '/kontakti', 'email telefon adresa facebook'],
    ['Privatësia', '/privatesia', 'privatësia të dhëna cookies'],
    ['28 Nëntori', '/festat/28-nentori', 'dita e flamurit pavarësia kuiz'],
  ];
  for (const [title, url, text] of pages) entries.push({ type: 'Faqe', title, text, url, keys: normalize(`${title} ${text}`) });
  for (const s of staff) {
    const text = `${s.roles.map((r) => r.label).join(', ')}${s.subjects.length ? ' · ' + s.subjects.join(', ') : ''}`;
    entries.push({ type: 'Staf', title: s.displayName, text, url: `/stafi?q=${encodeURIComponent(s.displayName)}`, keys: normalize(`${s.displayName} ${s.aliases.join(' ')} ${text}`) });
  }
  for (const n of news) entries.push({ type: 'Lajm', title: n.title, text: `${formatDate(n.publishedAt)} · ${n.summary}`, url: `/lajme/${n.slug}`, keys: normalize(`${n.title} ${n.summary} ${n.category}`) });
  for (const d of documents) entries.push({ type: 'Dokument', title: d.title, text: `${d.category} · ${d.schoolYear}`, url: '/dokumente', keys: normalize(`${d.title} ${d.originalTitle} ${d.description} ${d.category}`) });
  return entries;
}

export interface Club { id: string; title: string; category: string; group: string | null; photo: string | null; context?: string }
export const clubs = clubsData.clubs as Club[];
