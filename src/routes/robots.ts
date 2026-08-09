import { route } from "@njinlabs/njin";
import siteUrl from "../lib/site-url";

export default route().get("/robots.txt", () => {
  const body =
    `User-agent: *\n` +
    `Allow: /\n` +
    // Transactional/private routes carry no SEO value and order pages can expose
    // a customer's order number — keep all of these out of the index.
    `Disallow: /cart\n` +
    `Disallow: /checkout\n` +
    `Disallow: /wishlist\n` +
    `Disallow: /order/\n` +
    `Disallow: /api/\n` +
    `Disallow: /_admin\n` +
    `Disallow: /uploads/\n` +
    `\n` +
    `Sitemap: ${siteUrl()}/sitemap.xml\n`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
});
