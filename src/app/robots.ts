import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

/**
 * robots.txt
 *
 * The disallow list covers pages that expose private data behind an
 * unguessable token, or that are simply never useful to a crawler:
 *
 *   /invoice/   token-gated, and the token is the only credential
 *   /newsletter confirm and unsubscribe links carry a subscriber token
 *   /api        never useful to a crawler, and some routes accept POSTs
 *
 * The admin and the sign-in page are DELIBERATELY ABSENT.
 *
 * robots.txt is public. Listing a path here is a signed statement that the
 * path exists and is worth hiding — the first place anyone looks when probing
 * a site is its disallow list. Both are already behind an auth gate that
 * redirects, and neither is linked from anywhere a crawler can reach, so
 * naming them here bought nothing and gave away the location.
 *
 * The token pages still send `noindex` in their metadata, which is the
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
        disallow: [
          "/api/",
          "/invoice/",
          "/proposal/",
          "/portal",
          "/newsletter/",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
