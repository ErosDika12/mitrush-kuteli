import { news } from '../lib/data';
import { ALLOW_INDEXING, SITE_URL } from '../lib/site';

const staticPaths = ['/', '/shkolla', '/stafi', '/lajme', '/aktivitete', '/klubet', '/galeria', '/oraret', '/per-prinder', '/konsultimet', '/dokumente', '/kontakti', '/festat/28-nentori', '/privatesia'];

// Directory-style build: canonical URLs end with a slash, so the sitemap lists the same form.
export function GET() {
  // Only published content is listed; drafts never reach `news`.
  const urls = ALLOW_INDEXING ? [...staticPaths, ...news.map((n) => `/lajme/${n.slug}`)] : [];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${SITE_URL}${u === '/' ? '/' : u + '/'}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
