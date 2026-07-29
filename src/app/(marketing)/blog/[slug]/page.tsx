import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { SITE } from "@/lib/constants";
import { ScrollProgress } from "@/components/motion/ScrollProgress";

/**
 * Blog post.
 *
 * This route did not exist, so every link from the index 404'd — the index has
 * always linked to /blog/[slug].
 *
 * getBySlug enforces both the published flag and the schedule, so a draft or a
 * future-dated post is a 404 here rather than a preview anyone can reach by
 * guessing the URL.
 */

async function load(slug: string) {
  if (!isConvexConfigured) return null;
  return await fetchQuery(api.posts.getBySlug, { slug }).catch(() => null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) return { title: "Not found" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `${SITE.url}/blog/${post.slug}`,
      publishedTime: new Date(
        post.publishedAt ?? post._creationTime,
      ).toISOString(),
      images: post.coverUrl ? [{ url: post.coverUrl }] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) notFound();

  const published = new Date(post.publishedAt ?? post._creationTime);

  return (
    <>
      <ScrollProgress />

      <article className="mx-auto max-w-2xl px-6 py-24">
        {/* BlogPosting structured data, so the post can appear as an article
            rather than a generic page in search results. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.excerpt,
              datePublished: published.toISOString(),
              author: { "@type": "Person", name: "Yusuf Diallo" },
              mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
              image: post.coverUrl ? [post.coverUrl] : undefined,
            }),
          }}
        />

        <Link
          href="/blog"
          className="text-sm text-secondary transition-colors duration-fast hover:text-primary"
        >
          ← All posts
        </Link>

        <h1 className="mt-8 text-4xl">{post.title}</h1>

        <p className="mt-4 text-sm text-secondary">
          <time dateTime={published.toISOString()}>
            {published.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          {post.readingTime ? ` · ${post.readingTime} min read` : ""}
        </p>

        {post.coverUrl ? (
          <div className="relative mt-10 aspect-[2/1] overflow-hidden rounded-xl bg-surface-2">
            <Image
              src={post.coverUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 42rem"
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        <div className="legal-prose mt-12">
          <Markdown source={post.body} />
        </div>

        {post.tags && post.tags.length > 0 ? (
          <div className="mt-14 flex flex-wrap gap-2">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-[color:var(--border-hairline)] px-2.5 py-1 text-xs text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    </>
  );
}

/**
 * The same markdown subset the admin preview renders, so what is previewed is
 * what ships. Deliberately small — headings, lists and paragraphs cover
 * everything I actually write.
 */
function Markdown({ source }: { source: string }) {
  return (
    <>
      {source.split(/\n{2,}/).map((block, i) => {
        const text = block.trim();
        if (!text) return null;

        if (text.startsWith("## ")) return <h2 key={i}>{text.slice(3)}</h2>;
        if (text.startsWith("# ")) return <h2 key={i}>{text.slice(2)}</h2>;

        if (text.startsWith("- ")) {
          return (
            <ul key={i}>
              {text.split("\n").map((line, j) => (
                <li key={j}>{line.replace(/^-\s*/, "")}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{text}</p>;
      })}
    </>
  );
}
