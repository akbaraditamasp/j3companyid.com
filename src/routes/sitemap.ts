import { route, type FilterValue } from "@njinlabs/njin";
import siteUrl from "../lib/site-url";
import brand from "../models/brand";
import category from "../models/category";
import product from "../models/product";

type UrlEntry = { loc: string; lastmod?: string; changefreq?: string; priority?: string };

// `.read()` caps at limit 100 (see CLAUDE.md) — page through every record of a
// model so the sitemap doesn't silently drop entries once a catalog grows past 100.
const readAll = async (model: typeof product | typeof brand | typeof category, filters?: Record<string, FilterValue>) => {
  const all: Array<{ slug: string; updatedAt: string }> = [];
  let page = 1;

  while (true) {
    const result = await model.read({ limit: 100, page, filters, sort: "updatedAt", order: "desc" });
    all.push(...(result.data as Array<{ slug: string; updatedAt: string }>));
    if (page >= result.meta.pageCount) break;
    page++;
  }

  return all;
};

const toXml = (entries: UrlEntry[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries
    .map(
      (e) =>
        `  <url>\n` +
        `    <loc>${e.loc}</loc>\n` +
        (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ``) +
        (e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>\n` : ``) +
        (e.priority ? `    <priority>${e.priority}</priority>\n` : ``) +
        `  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

export default route().get("/sitemap.xml", async () => {
  const origin = siteUrl();
  const today = new Date().toISOString().slice(0, 10);

  const staticEntries: UrlEntry[] = [
    { loc: `${origin}/`, changefreq: "daily", priority: "1.0", lastmod: today },
    { loc: `${origin}/shop`, changefreq: "daily", priority: "0.9", lastmod: today },
    { loc: `${origin}/brands`, changefreq: "weekly", priority: "0.7" },
    { loc: `${origin}/about`, changefreq: "monthly", priority: "0.5" },
    { loc: `${origin}/standard`, changefreq: "monthly", priority: "0.5" },
    { loc: `${origin}/contact`, changefreq: "monthly", priority: "0.5" },
    { loc: `${origin}/shipping-returns`, changefreq: "monthly", priority: "0.4" },
    { loc: `${origin}/privacy-policy`, changefreq: "yearly", priority: "0.3" },
    { loc: `${origin}/terms`, changefreq: "yearly", priority: "0.3" },
  ];

  const [products, brands, categories] = await Promise.all([
    readAll(product, { status: { $eq: "PUBLISH" } }),
    readAll(brand),
    readAll(category),
  ]);

  const productEntries: UrlEntry[] = products.map((p) => ({
    loc: `${origin}/shop/${p.slug}`,
    lastmod: p.updatedAt.slice(0, 10),
    changefreq: "weekly",
    priority: "0.8",
  }));

  const brandEntries: UrlEntry[] = brands.map((b) => ({
    loc: `${origin}/brands/${b.slug}`,
    lastmod: b.updatedAt.slice(0, 10),
    changefreq: "weekly",
    priority: "0.6",
  }));

  const categoryEntries: UrlEntry[] = categories.map((c) => ({
    loc: `${origin}/shop/category/${c.slug}`,
    lastmod: c.updatedAt.slice(0, 10),
    changefreq: "weekly",
    priority: "0.7",
  }));

  const xml = toXml([...staticEntries, ...productEntries, ...brandEntries, ...categoryEntries]);

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
});
