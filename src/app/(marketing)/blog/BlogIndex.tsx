"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { usePreloadedQuery, useMutation, useQuery, type Preloaded } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { useCapability } from "@/components/providers/CapabilityProvider";
import { visitorId } from "@/lib/referral";
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

/** How many posts the server preloads, and how many each scroll adds. */
const INITIAL_LIMIT = 20;
const PAGE = 10;

/**
 * Below this there is no stories row.
 *
 * Two circles above a list of two posts is the same two links twice, which
 * reads as a padded page rather than a shortcut. The same rule the testimonial
 * rows use, for the same reason.
 */
const STORIES_MINIMUM = 3;

/** How many recent posts the stories row carries. */
const STORIES_COUNT = 8;

/** A list, not a grid — posts are read linearly, newest first. */
export function BlogIndex({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.posts.listPublished>;
}) {
  const initial = usePreloadedQuery(preloaded) as Post[] | undefined;

  /*
   * Infinite scroll by raising the limit rather than by cursor pagination.
   *
   * listPublished filters on the schedule AFTER taking rows, so a cursor would
   * hand back short pages whenever a scheduled post sat inside one — and a
   * paginator that sometimes returns four of ten looks broken from the outside.
   * Raising the limit asks the same question with a bigger answer, which Convex
   * serves from its cache and diffs against what is already on screen.
   *
   * The cost is refetching the head of the list on each page. At the scale a
   * blog reaches that is a few kilobytes; at ten times this length the right
   * answer is a real paginated query with the schedule filter moved into the
   * index.
   */
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const extended = useQuery(
    api.posts.listPublished,
    isConvexConfigured && limit > INITIAL_LIMIT ? { limit } : "skip",
  ) as Post[] | undefined;

  const posts = extended ?? initial;
  // A short answer to a long question means there is nothing left to ask for.
  const exhausted = posts !== undefined && posts.length < limit;

  /*
   * Counts for every post on the page in one subscription.
   *
   * Reactive, so a like or an approved comment appears here without a refresh
   * — the point being that you can see engagement from the index rather than
   * having to open each post to find out.
   */
  const counts = useQuery(
    api.engagement.countsForPosts,
    isConvexConfigured && posts?.length
      ? { postIds: posts.map((p) => p._id as Id<"posts">) }
      : "skip",
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || exhausted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLimit((current) => current + PAGE);
        }
      },
      // Fires a screen early, so the next posts are already there by the time
      // the reader reaches the end rather than arriving after a visible gap.
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [exhausted, limit]);

  if (!posts || posts.length === 0) {
    return (
      <p className="mt-6 text-secondary">
        Nothing published yet. Check back shortly.
      </p>
    );
  }

  return (
    <>
      {posts.length >= STORIES_MINIMUM ? (
        <StoriesRow posts={posts.slice(0, STORIES_COUNT)} />
      ) : null}

      <ul className="mt-12 divide-y divide-[color:var(--border-hairline)]">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} counts={counts?.[post._id]} />
        ))}
      </ul>

      {/* The sentinel, and the only thing that says more is coming. No spinner:
          the next posts are requested a screen early and are almost always
          already rendered by the time this would have been seen. */}
      {!exhausted ? (
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      ) : null}
    </>
  );
}

/**
 * The stories row — the most recent posts as a swipeable strip.
 *
 * A blog index is chronological, which serves someone catching up and fails
 * someone arriving for the first time: the newest post is at the top and
 * everything else is a scroll away. This puts the last eight within one
 * gesture without disturbing the order of the list below it.
 */
function StoriesRow({ posts }: { posts: Post[] }) {
  return (
    <Reveal>
      <div
        className="scroll-row mt-10 flex gap-4 overflow-x-auto pb-2"
        style={{ touchAction: "pan-x pan-y" }}
      >
        {posts.map((post) => (
          <Link
            key={post._id}
            href={`/blog/${post.slug}`}
            className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center"
          >
            <span className="relative block size-16 overflow-hidden rounded-full ring-1 ring-[color:var(--border-hairline)] transition-[box-shadow] duration-hover ease-hover group-hover:ring-[color:var(--accent)]">
              {post.coverUrl ? (
                <Image
                  src={post.coverUrl}
                  alt=""
                  fill
                  sizes="4rem"
                  className="object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center bg-surface-2 text-sm text-secondary">
                  {post.title.charAt(0)}
                </span>
              )}
            </span>
            {/* Two lines, then it stops. A title clamped at two lines is a
                label; a title wrapped to five turns the row into a paragraph. */}
            <span className="line-clamp-2 text-[11px] leading-tight text-secondary">
              {post.title}
            </span>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

/** One emoji in flight from a tap. */
type Emission = { id: number; x: number; y: number; drift: number };

/**
 * One post in the feed.
 *
 * NOTHING ANIMATES IN. An infinite feed where every card resolves as it
 * arrives becomes exhausting by the third screen, and the reader is scrolling
 * precisely because they are looking for something — making them wait for each
 * candidate to fade up is the opposite of helping.
 *
 * What it does instead is weight what is already there: cards near the middle
 * of the viewport read at full strength and cards at the edges fall back, so a
 * long feed has a natural reading position rather than presenting everything
 * with equal claim on the eye.
 */
function PostCard({
  post,
  counts,
}: {
  post: Post;
  counts?: { likes: number; comments: number };
}) {
  const reduceMotion = useReducedMotion();
  const { tier } = useCapability();
  const ref = useRef<HTMLLIElement>(null);

  /*
   * Both the reading focus and the cover parallax come off ONE scroll
   * subscription per card. Progress runs 0 as the card enters at the bottom to
   * 1 as it leaves at the top, so 0.5 is the moment it is centred.
   */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Plateaued through the middle rather than peaking at exactly 0.5: a card
  // that is only ever fully legible at one scroll position is a card you have
  // to aim at.
  const focusOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0.65, 1, 1, 0.65],
  );
  const focusBlur = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [1, 0, 0, 1]);
  const focusFilter = useMotionTemplate`blur(${focusBlur}px)`;

  /*
   * The cover moves at 0.85x the card, so it lags its own frame.
   *
   * The image is rendered taller than the frame and shifted within it —
   * without the extra height the parallax would drag an edge into view at one
   * end of the travel, which is the single most common way this effect is got
   * wrong.
   */
  const coverY = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  /*
   * Blurring text is a full repaint of the card on every frame it changes.
   * Worth it on a machine that can afford it and the first thing to drop on
   * one that cannot — the opacity falloff carries the same information at a
   * fraction of the cost, so below `full` only that survives.
   */
  /*
   * Keyed off the TIER ALONE, not off useReducedMotion.
   *
   * The tier already encodes the preference and does it SSR-safely:
   * detectStaticTier() floors to `minimal` on prefers-reduced-motion, and the
   * capability store resolves after hydration from a server value the client's
   * first paint also renders. useReducedMotion does the opposite — null on the
   * server, boolean on the client — so ANDing it in here made these two flags
   * differ between the passes and took the /blog route's hydration with them.
   *
   * `dimming` therefore goes false on a reduced-motion device anyway, one
   * commit later, and [data-focus-track] in globals.css covers the gap before
   * that lands.
   */
  const focusing = tier === "full";
  const dimming = tier !== "minimal";

  /* ---------------------------------------------------------- reactions --- */

  const [visitor] = useState(() => (isConvexConfigured ? visitorId() : ""));
  const toggleLike = useMutation(api.engagement.toggleLike);
  const [emissions, setEmissions] = useState<Emission[]>([]);
  const emissionId = useRef(0);
  const lastTap = useRef(0);

  const react = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const now = event.timeStamp;
      // 300ms is the window every platform uses for a double tap, and using
      // the event's own timestamp rather than Date.now keeps it accurate under
      // a busy main thread.
      if (now - lastTap.current > 300) {
        lastTap.current = now;
        return;
      }
      lastTap.current = 0;

      if (isConvexConfigured && visitor) {
        void toggleLike({
          postId: post._id as Id<"posts">,
          visitorId: visitor,
        });
      }

      if (reduceMotion) return;

      const box = event.currentTarget.getBoundingClientRect();
      const id = emissionId.current++;
      setEmissions((current) => [
        ...current,
        {
          id,
          x: event.clientX - box.left,
          y: event.clientY - box.top,
          // Without this, tapping twice in the same spot stacks two identical
          // arcs and reads as one emoji rather than two reactions.
          drift: (id % 7) * 6 - 18,
        },
      ]);
      window.setTimeout(
        () => setEmissions((current) => current.filter((e) => e.id !== id)),
        700,
      );
    },
    [post._id, reduceMotion, toggleLike, visitor],
  );

  return (
    <motion.li
      ref={ref}
      className="relative"
      /*
        NOT GATED ON reduceMotion. `focusOpacity` rests at 0.65 rather than 1,
        so the server serialised `opacity:0.65` onto every card while a
        reduced-motion client serialised nothing — an attribute mismatch that
        failed hydration for the whole /blog route.

        `dimming` and `focusing` still gate these, but they now depend only on
        the capability tier, which is SSR-safe by construction: the server and
        the client's first paint both resolve `reduced`. The reduced-motion
        preference is applied by CSS instead — see [data-focus-track] in the
        reduced-motion block of globals.css.
      */
      data-focus-track
      style={{
        opacity: dimming ? focusOpacity : undefined,
        filter: focusing ? focusFilter : undefined,
      }}
      onPointerDown={react}
    >
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
            {/* -inset-y-[7%] gives the image the extra height the parallax
                travels through, so neither end of the range exposes a gap. */}
            {/* Unconditional for the same reason as the card above: coverY
                rests at "-7%", not at zero, so gating the prop changed the
                rendered transform between server and client. The reduced-motion
                CSS pins it. */}
            <motion.div
              className="absolute inset-x-0 -inset-y-[7%]"
              data-parallax-track
              style={{ y: coverY }}
            >
              <Image
                src={post.coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 640px) 7rem, 100vw"
              />
            </motion.div>
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
            {post.readingTime ? <span>{post.readingTime} min read</span> : null}
            {post.tags?.length ? <span>{post.tags.join(" · ")}</span> : null}
          </p>

          <Counts counts={counts} />
        </div>
      </Link>

      {/* The emitted reactions. Outside the link so a tap that lands on one
          mid-flight still reaches the card underneath. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        {emissions.map((emission) => (
          <motion.span
            key={emission.id}
            className="absolute text-2xl"
            style={{ left: emission.x, top: emission.y }}
            initial={{ x: "-50%", y: "-50%", scale: 0.6, opacity: 1 }}
            animate={{
              // A slight arc rather than a straight climb — the sideways drift
              // arrives late, so the emoji leaves the finger going up and only
              // then leans away.
              x: [`-50%`, `calc(-50% + ${emission.drift * 0.4}px)`, `calc(-50% + ${emission.drift}px)`],
              y: ["-50%", "calc(-50% - 46px)", "calc(-50% - 80px)"],
              scale: [0.6, 1.4, 0.9],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            ♥
          </motion.span>
        ))}
      </span>
    </motion.li>
  );
}

/**
 * Live like and comment counts.
 *
 * ONE subscription for the whole page, passed down — not one per card. Twenty
 * cards asking the same question twenty times is twenty query executions to
 * answer what a single batched read already covers, and infinite scroll only
 * makes that worse.
 *
 * Shown at zero as well, so the absence of a number never has to be read as
 * "none" or as "not counted".
 */
function Counts({ counts }: { counts?: { likes: number; comments: number } }) {
  return (
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
        <span className="tabular-nums">{counts?.likes ?? 0}</span>
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
        <span className="tabular-nums">{counts?.comments ?? 0}</span>
        <span className="sr-only">comments</span>
      </span>
    </p>
  );
}
