"use client";

import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { Marquee } from "@/components/motion/Marquee";
import { Reveal } from "@/components/motion/Reveal";
import { BlurBudgetGroup } from "@/components/motion/BlurBudget";
import { Tilt } from "@/components/motion/Tilt";

/**
 * Testimonials — two marquee rows running in opposite directions.
 *
 * Below three items there is no marquee. A two-card loop visibly repeats every
 * few seconds, which reads as "we have two clients" more loudly than saying
 * nothing at all — so a single static card is shown instead. An empty table
 * renders no section whatsoever.
 */

const PLATFORMS = [
  "Convex",
  "Stripe",
  "Resend",
  "Vercel",
  "Next.js",
  "Supabase",
];

type Testimonial = {
  _id: string;
  author: string;
  role?: string;
  company?: string;
  quote: string;
  website?: string;
  avatarUrl?: string;
};

export function Testimonials({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.testimonials.listFeatured>;
}) {
  const items = usePreloadedQuery(preloaded) as Testimonial[] | undefined;

  // Empty table — the section does not exist.
  if (!items || items.length === 0) return null;

  const enough = items.length >= 3;

  // Split across two rows so neither is a copy of the other.
  const midpoint = Math.ceil(items.length / 2);
  const rowOne = items.slice(0, midpoint);
  const rowTwo = items.slice(midpoint);

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="overflow-hidden py-24"
    >
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <h2 id="testimonials-heading" className="text-3xl">
            What people say
          </h2>
        </Reveal>

        {/* Platform strip — text, not logos. */}
        <Reveal delay={0.08}>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2">
            {PLATFORMS.map((name) => (
              <li
                key={name}
                className="platform-name text-sm text-secondary"
              >
                {name}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {enough ? (
        <div className="mt-12 space-y-6">
          {/*
            One budget entry per ROW, not per card.

            Cards inside a marquee cross the viewport edge continuously under
            their own motion, whether or not the user scrolls — so registering
            each one would claim and release slots several times a second and
            strobe the whole row. No amount of scroll hysteresis fixes that,
            because the elements genuinely are entering and leaving. The
            compositor cost is the row anyway.

            Low priority: a marquee card is decoration, and should never take
            blur from a pricing tier or a hero slab that is standing still.
          */}
          <BlurBudgetGroup priority={-1}>
            <Marquee speed={70} gap={24} pauseOnHover>
              {rowOne.map((item) => (
                <TestimonialCard key={item._id} item={item} />
              ))}
            </Marquee>
          </BlurBudgetGroup>

          {/* Opposite direction, different speed — the two rows must not
              appear to be one block sliding. */}
          <BlurBudgetGroup priority={-1}>
            <Marquee speed={95} gap={24} direction="right" pauseOnHover>
              {(rowTwo.length > 0 ? rowTwo : rowOne).map((item) => (
                <TestimonialCard key={`b-${item._id}`} item={item} />
              ))}
            </Marquee>
          </BlurBudgetGroup>
        </div>
      ) : (
        /* Every item, not just the first. This rendered items[0] alone, so
           featuring a second testimonial appeared to do nothing at all. Two
           side by side; one fills the column on its own. */
        <div className="mx-auto mt-12 max-w-4xl px-6">
          <div
            className={`grid gap-6 ${items.length > 1 ? "sm:grid-cols-2" : "mx-auto max-w-xl"}`}
          >
            {items.map((item, index) => (
              <Reveal key={item._id} delay={index * 0.07}>
                {/* Tilt only on the static grid. A card already translating
                    inside a marquee would be fighting two transforms, and the
                    tilt would read as a wobble rather than a response. */}
                <Tilt className="h-full rounded-2xl">
                  <TestimonialCard item={item} wide />
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TestimonialCard({
  item,
  wide = false,
}: {
  item: Testimonial;
  wide?: boolean;
}) {
  return (
    <LiquidGlass
      shape="card"
      // Far depth: these sit in a marquee behind the page's focus, and the
      // cheapest blur is the right one for something that is always moving.
      depth="far"
      className={wide ? "w-full" : "w-[min(22rem,80vw)]"}
    >
      <blockquote className="text-sm text-primary">
        &ldquo;{item.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-4 flex items-center gap-3">
        {item.avatarUrl ? (
          // Avatars are small, decorative and often external; a plain img
          // avoids routing every one through the image optimiser.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatarUrl}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-surface-3 text-xs text-secondary"
          >
            {item.author.charAt(0)}
          </span>
        )}
        <span className="text-xs text-secondary">
          {item.author}
          {item.role ? `, ${item.role}` : ""}
          {item.company ? (
            <>
              {" · "}
              {/* The company links to their site when there is one. A quote
                  you can click through and verify carries more weight than
                  one you have to take on trust.

                  noopener because the target is a third-party site: without
                  it the opened page can reach back through window.opener. */}
              {item.website ? (
                <a
                  href={item.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent transition-opacity duration-fast hover:opacity-80"
                >
                  {item.company}
                </a>
              ) : (
                item.company
              )}
            </>
          ) : null}
        </span>
      </figcaption>
    </LiquidGlass>
  );
}
