// `request.url`'s origin reflects the scheme/host Bun's HTTP server itself sees —
// behind a TLS-terminating reverse proxy (the standard deploy shape here, per
// .github/workflows/deploy.yml: plain rsync + PORT env, no in-app TLS) that's
// "http://…" even in production, which would poison canonical/OG/sitemap URLs
// with the wrong scheme. SITE_URL lets ops pin the real public origin; falls
// back to the production domain so it's still correct with no .env change on
// the deploy host. Shared by src/helpers/site-url.ts (template global) and
// src/routes/seo.ts (robots.txt / sitemap.xml), so both stay in sync.
export default function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://j3companyid.com").replace(/\/+$/, "");
}
