import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { SITE } from "@/lib/constants";

/**
 * sitemap.xml
 *
 * Static routes are listed explicitly rather than derived from the filesystem,
 * because "every page.tsx" is the wrong set — it would include /admin and the
 * token-gated invoice pages, which must never be advertised.
 *
 * Project and post URLs come from Convex so publishing something new puts it
 * in the sitemap without a deploy. If Convex is unreachable the static routes
 * still ship: a partial sitemap is far better than a 500 on a file search
 * engines poll constantly.
 */

type Entry = MetadataRoute.Sitemap[number];

const STATIC: { path: string; priority: number; freq: Entry["changeFrequency"] }[] =
  [
    { path: "/", priority: 1, freq: "weekly" },
    { path: "/work", priority: 0.9, freq: "weekly" },
    { path: "/pricing", priority: 0.9, freq: "monthly" },
    { path: "/services", priority: 0.8, freq: "monthly" },
    { path: "/about", priority: 0.7, freq: "monthly" },
    { path: "/start", priority: 0.8, freq: "monthly" },
    { path: "/blog", priority: 0.7, freq: "weekly" },
  ];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC.map((route) => ({
    url: `${SITE.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.freq,
    priority: route.priority,
  }));

  if (!isConvexConfigured) return entries;

  // Published content only. A draft in the sitemap is an invitation to index
  // a 404, which costs crawl budget and looks broken in Search Console.
  try {
    const projects = await fetchQuery(api.projects.listPublished, {});
    for (const project of projects) {
      entries.push({
        url: `${SITE.url}/work/${project.slug}`,
        lastModified: new Date(project._creationTime),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  } catch {
    // Sitemap generation must not fail the route.
  }

  try {
    const posts = await fetchQuery(api.posts.listPublished, {});
    for (const post of posts) {
      entries.push({
        url: `${SITE.url}/blog/${post.slug}`,
        lastModified: new Date(post.publishedAt ?? post._creationTime),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // As above.
  }

  return entries;
}
