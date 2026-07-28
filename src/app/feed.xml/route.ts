import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { SITE } from "@/lib/constants";

/**
 * RSS 2.0 feed.
 *
 * Built by hand rather than with a library: the format is a dozen lines, and a
 * dependency for this is a dependency to keep patched forever.
 *
 * Everything interpolated is escaped. A post title containing an ampersand
 * would otherwise produce XML that no reader can parse — which fails silently,
 * because feed readers do not report errors to the site owner.
 */

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  let items = "";

  if (isConvexConfigured) {
    try {
      const posts = await fetchQuery(api.posts.listPublished, {});
      items = posts
        .map((post: {
          title: string;
          slug: string;
          excerpt?: string;
          publishedAt?: number;
          _creationTime: number;
        }) => {
          const url = `${SITE.url}/blog/${post.slug}`;
          const date = new Date(
            post.publishedAt ?? post._creationTime,
          ).toUTCString();
          return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${date}</pubDate>
      ${post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : ""}
    </item>`;
        })
        .join("\n");
    } catch {
      // An empty feed is valid XML. A 500 on a file readers poll hourly is
      // not, and gets the feed dropped.
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${escapeXml(SITE.url)}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(SITE.url)}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
