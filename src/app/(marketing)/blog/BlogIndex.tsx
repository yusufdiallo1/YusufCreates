"use client";

import Link from "next/link";
import Image from "next/image";
import { usePreloadedQuery, useQuery, type Preloaded } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";
import { Reveal } from "@/components/motion/Reveal";

type Post = {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl?: string;
  publishedAt?: number;
  readingTime?: number;
  tags?: string[];
};

/** A list, not a grid — posts are read linearly, newest first. */
export function BlogIndex({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.posts.listPublished>;
}) {
  const posts = usePreloadedQuery(preloaded) as Post[] | undefined;

  /*
   * Counts for every post on the page in one subscription.
   *
   * Reactive, so a like or an approved comment appears here without a
   * refresh — the point being that you can see engagement from the index
   * rather than having to open each post to find out.
   */
  const counts = useQuery(
    api.engagement.countsForPosts,
    isConvexConfigured && posts?.length
      ? { postIds: posts.map((p) => p._id as Id<"posts">) }
      : "skip",
  );

  if (!posts || posts.length === 0) {
    return (
      <p className="mt-6 text-secondary">
        Nothing published yet. Check back shortly.
      </p>
    );
  }

  return (
    <ul className="mt-12 divide-y divide-[color:var(--border-hairline)]">
      {posts.map((post, index) => (
        <li key={post._id}>
          <Reveal delay={index * 0.05}>
            <Link
              href={`/blog/${post.slug}`}
              /* Thumbnail beside the text on anything wider than a phone; the
                 list stays linear either way. On a phone the cover would
                 squeeze the title into two words per line, so it stacks. */
              className="flex flex-col gap-5 py-8 sm:flex-row sm:items-start"
            >
              {post.coverUrl ? (
                <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-surface-1 sm:aspect-square sm:w-28">
                  <Image
                    src={post.coverUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(min-width: 640px) 7rem, 100vw"
                  />
                </div>
              ) : null}

              <div className="min-w-0">
                <h2 className="text-xl text-primary">{post.title}</h2>
                {post.excerpt ? (
                  <p className="mt-2 text-sm text-secondary">{post.excerpt}</p>
                ) : null}
                <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-secondary">
                  {post.publishedAt ? (
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  ) : null}
                  {post.readingTime ? (
                    <span>{post.readingTime} min read</span>
                  ) : null}
                  {post.tags?.length ? (
                    <span>{post.tags.join(" · ")}</span>
                  ) : null}
                </p>

                {/* Counts, live. Shown at zero as well, so the absence of a
                    number never has to be read as "none" or "not counted". */}
                <p className="mt-2.5 flex items-center gap-4 text-xs text-secondary">
                  <span className="flex items-center gap-1.5">
                    <svg
                      viewBox="0 0 24 24"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M12 20.5s-7.5-4.7-7.5-9.6a4.2 4.2 0 0 1 7.5-2.6 4.2 4.2 0 0 1 7.5 2.6c0 4.9-7.5 9.6-7.5 9.6Z" />
                    </svg>
                    <span className="tabular-nums">
                      {counts?.[post._id]?.likes ?? 0}
                    </span>
                    <span className="sr-only">likes</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg
                      viewBox="0 0 24 24"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" />
                    </svg>
                    <span className="tabular-nums">
                      {counts?.[post._id]?.comments ?? 0}
                    </span>
                    <span className="sr-only">comments</span>
                  </span>
                </p>
              </div>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
