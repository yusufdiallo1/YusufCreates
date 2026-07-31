import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { SITE } from "@/lib/constants";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { JsonLd } from "@/components/seo/JsonLd";
import { renderMarkdown } from "@/lib/markdown";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { PostEngagement } from "@/components/marketing/PostEngagement";

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
        <JsonLd data={{
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.excerpt,
              datePublished: published.toISOString(),
              author: { "@type": "Person", name: "Yusuf Diallo" },
              mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
              image: post.coverUrl ? [post.coverUrl] : undefined,
            }} />

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

        {/* A video post leads with the player rather than a still — the
            poster image is already the video's first frame. */}
        {post.kind === "video" && post.videoUrl ? (
          <VideoPlayer
            url={post.videoUrl}
            poster={post.coverUrl}
            className="mt-10"
          />
        ) : post.coverUrl ? (
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

        {post.body.trim() ? (
          <div className="legal-prose mt-12">{renderMarkdown(post.body)}</div>
        ) : null}

        {/* Gallery below the words, so any framing text is read first. Each
            image keeps its own aspect ratio rather than being cropped to a
            uniform box — a gallery of crops is a contact sheet. */}
        {post.kind === "images" && post.images && post.images.length > 0 ? (
          <div className="mt-12 space-y-6">
            {post.images.map((src: string, i: number) => {
              /* The shape chosen for the set. "auto" keeps each image as it
                 is; anything else crops to a common frame, which is what
                 makes a gallery read as one set rather than a pile. */
              const ratio = post.imageRatio ?? "4:5";
              const frame =
                ratio === "1:1"
                  ? "aspect-square"
                  : ratio === "16:9"
                    ? "aspect-video"
                    : ratio === "auto"
                      ? ""
                      : "aspect-[4/5]";

              return (
                <div
                  key={`${src}-${i}`}
                  className={`relative overflow-hidden rounded-xl bg-surface-2 ${frame}`}
                >
                  <Image
                    src={src}
                    alt=""
                    {...(ratio === "auto"
                      ? { width: 1600, height: 1200 }
                      : { fill: true })}
                    sizes="(max-width: 768px) 100vw, 42rem"
                    className={
                      ratio === "auto" ? "h-auto w-full" : "object-cover"
                    }
                    priority={i === 0}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

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

        <PostEngagement postId={post._id} />
      </article>
    </>
  );
}

