import { school } from './data';

/** Canonical origin; undefined for private previews. */
export const SITE_URL: string | undefined = (import.meta.env.SITE_URL || process.env.SITE_URL || undefined)?.replace(/\/$/, '');
// Astro coerces "true"/"false" in import.meta.env to booleans, so compare as text.
export const ALLOW_INDEXING = String(import.meta.env.ALLOW_INDEXING ?? process.env.ALLOW_INDEXING ?? '').trim().toLowerCase() === 'true' && !!SITE_URL;

/** Optional Google Search Console HTML-tag verification token (public value, e.g. from google-site-verification). */
const gsv = String(import.meta.env.GOOGLE_SITE_VERIFICATION ?? process.env.GOOGLE_SITE_VERIFICATION ?? '').trim();
export const GOOGLE_SITE_VERIFICATION: string | undefined = /^[A-Za-z0-9_-]{20,120}$/.test(gsv) ? gsv : undefined;

export interface NavItem { label: string; href: string; match: string[] }

/** Exactly five primary pages. Everything else lives under one of them (see sections below). */
export const nav: NavItem[] = [
  { label: 'Ballina', href: '/', match: ['/'] },
  { label: 'Shkolla', href: '/shkolla', match: ['/shkolla', '/festat'] },
  { label: 'Stafi', href: '/stafi', match: ['/stafi'] },
  { label: 'Jeta shkollore', href: '/aktivitete', match: ['/aktivitete', '/lajme', '/klubet', '/galeria'] },
  { label: 'Për prindërit', href: '/per-prinder', match: ['/per-prinder', '/oraret', '/konsultimet', '/dokumente', '/kontakti'] },
];

export type SectionId = 'jeta' | 'prindi';
export const sections: Record<SectionId, { title: string; items: { label: string; href: string; match?: string[] }[] }> = {
  jeta: {
    title: 'Jeta shkollore',
    items: [
      { label: 'Përmbledhje', href: '/aktivitete', match: ['/aktivitete'] },
      { label: 'Lajme', href: '/lajme', match: ['/lajme'] },
      { label: 'Klubet', href: '/klubet', match: ['/klubet'] },
      { label: 'Galeria', href: '/galeria', match: ['/galeria'] },
    ],
  },
  prindi: {
    title: 'Për prindërit',
    items: [
      { label: 'Përmbledhje', href: '/per-prinder', match: ['/per-prinder'] },
      { label: 'Orari', href: '/oraret', match: ['/oraret'] },
      { label: 'Konsultimet', href: '/konsultimet', match: ['/konsultimet'] },
      { label: 'Dokumentet', href: '/dokumente', match: ['/dokumente'] },
      { label: 'Njoftimet', href: '/per-prinder#njoftimet' },
      { label: 'Kontakti', href: '/kontakti', match: ['/kontakti'] },
    ],
  },
};

export const isOn = (path: string, match: string[] = []) =>
  match.some((m) => (m === '/' ? path === '/' : path === m || path.startsWith(m + '/')));

export function absoluteUrl(path: string): string | undefined {
  return SITE_URL ? new URL(path, SITE_URL + '/').toString() : undefined;
}

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.street + ', ' + school.location)}`;
export const osmUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(school.street + ' Prishtinë')}`;
