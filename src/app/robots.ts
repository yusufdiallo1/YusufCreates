import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

/**
 * robots.txt
 *
 * The disallow list is the important part. Everything here either exposes
 * private data behind an unguessable token or is an authenticated surface:
 *
 *   /admin      the whole back office
 *   /invoice/   token-gated, and the token is the only credential
 *   /newsletter confirm and unsubscribe links carry a subscriber token
 *   /api        never useful to a crawler, and some routes accept POSTs
 *
 * The token pages already send `noindex` in their metadata, which is the
 * binding signal. This is defence in depth: a crawler that ignores robots.txt
 * still gets the header, and a crawler that respects it never fetches the URL
 * in the first place.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/invoice/", "/newsletter/", "/sign-in-admin"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
