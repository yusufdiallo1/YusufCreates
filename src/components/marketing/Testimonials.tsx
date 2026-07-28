"use client";

import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { Marquee } from "@/components/motion/Marquee";
import { Reveal } from "@/components/motion/Reveal";

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
          <Marquee speed={70} gap={24} pauseOnHover>
            {rowOne.map((item) => (
              <TestimonialCard key={item._id} item={item} />
            ))}
          </Marquee>

          {/* Opposite direction, different speed — the two rows must not
              appear to be one block sliding. */}
          <Marquee speed={95} gap={24} direction="right" pauseOnHover>
            {(rowTwo.length > 0 ? rowTwo : rowOne).map((item) => (
              <TestimonialCard key={`b-${item._id}`} item={item} />
            ))}
          </Marquee>
        </div>
      ) : (
        <div className="mx-auto mt-12 max-w-xl px-6">
          <Reveal>
            <TestimonialCard item={items[0]} wide />
          </Reveal>
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
      variant="card"
      intensity="subtle"
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
          {item.company ? ` · ${item.company}` : ""}
        </span>
      </figcaption>
    </LiquidGlass>
  );
}
