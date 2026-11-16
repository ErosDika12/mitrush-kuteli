import { ALLOW_INDEXING, SITE_URL } from '../lib/site';

export function GET() {
  const body = ALLOW_INDEXING
    ? `User-agent: *\nAllow: /\nDisallow: /kerko\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : `# Private preview: indexing is disabled. Set SITE_URL and ALLOW_INDEXING=true for production.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
