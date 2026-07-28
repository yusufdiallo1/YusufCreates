"use client";

import Link from "next/link";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { Reveal } from "@/components/motion/Reveal";

type Post = {
  _id: string;
  slug: string;
  title: string;
  excerpt?: string;
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
              className="block py-8"
            >
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
                {post.tags?.length ? <span>{post.tags.join(" · ")}</span> : null}
              </p>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
