import { defineConfig } from 'astro/config';

// Set SITE_URL (e.g. https://example.org) when the real domain is known.
// Without it no canonical/og:url tags are emitted and the sitemap stays empty.
const site = process.env.SITE_URL || undefined;

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
