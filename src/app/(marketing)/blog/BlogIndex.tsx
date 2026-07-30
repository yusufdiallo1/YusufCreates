"use client";

import Link from "next/link";
import Image from "next/image";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
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
              data-cursor="view"
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
              </div>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
