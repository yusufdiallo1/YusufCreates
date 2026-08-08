"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { useEntryState } from "@/components/providers/EntryStateProvider";

/**
 * CredibilityStrip — proof, for someone who skipped the page that carries it.
 *
 * Landing straight on /pricing or /start means arriving at a number, or at a
 * form, having seen no work, no testimonial and no promise about how fast I
 * reply. That is usually a search result or a shared link, and it is the one
 * arrival where the site asks for a decision before it has earned one.
 *
 * One band, above the tables. Three thumbnails, one quote, one promise —
 * enough to establish that there is real work behind the price, not so much
 * that it becomes the homepage again. Someone who came here on purpose is
 * ready to decide; this exists so they can, not to slow them down.
 *
 * ---------------------------------------------------------------------------
 * IT IS ALWAYS RENDERED, AND HIDDEN WITH CSS.
 *
 * This is the one adaptation in the flow pass that would naturally be written
 * as a conditional mount, and it is exactly the case THE SSR RULE in
 * lib/entryState.ts forbids. Entry state is `cold` on the server and on the
 * client's first paint, so `{isHighIntent && <Strip />}` would insert a band
 * ABOVE the pricing tables one commit after hydration — pushing the whole page
 * down under the reader, on the page where they are trying to read a number.
 *
 * `hidden` costs a class on an element that renders either way. The queries
 * below run regardless, which is the honest trade: two cached reads that the
 * pricing page's own components largely share, in exchange for never moving
 * the page after paint.
 * ---------------------------------------------------------------------------
 */
export function CredibilityStrip() {
  const highIntent = useEntryState() === "high-intent";

  const projects = useQuery(
    api.projects.listFeatured,
    isConvexConfigured ? { limit: 3 } : "skip",
  );
  const testimonials = useQuery(
    api.testimonials.listFeatured,
    isConvexConfigured ? {} : "skip",
  );
  const copy = useQuery(
    api.settings.publicCopy,
    isConvexConfigured ? {} : "skip",
  );

  const quote = testimonials?.[0];
  const replyWindow = copy?.replyWindow ?? "24 hours";

  // Nothing to show is not the same as nothing to say — but a band with an
  // empty thumbnail row and no quote is worse than no band.
  const hasProof = (projects?.length ?? 0) > 0 || Boolean(quote);

  return (
    <section
      aria-label="Recent work and what to expect"
      className={
        highIntent && hasProof
          ? "mx-auto max-w-5xl px-6 pt-4 pb-12"
          : "hidden"
      }
    >
      <div className="hairline rounded-[var(--radius-lg)] bg-surface-1 p-6">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          {/* Three covers. Decorative — each links to its case study, and the
              title is carried by the link's accessible name rather than by an
              alt that would repeat it. */}
          {projects && projects.length > 0 ? (
            <ul className="flex gap-3">
              {projects.map((project) => (
                <li key={project._id}>
                  <Link
                    href={`/work/${project.slug}`}
                    data-cursor="view"
                    aria-label={`${project.title} — view case study`}
                    className="block overflow-hidden rounded-[var(--radius-xs)] transition-transform duration-hover ease-hover hover:-translate-y-0.5"
                  >
                    <span className="relative block h-16 w-24 bg-surface-2">
                      {project.coverUrl ? (
                        <Image
                          src={project.coverUrl}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-cover object-top"
                        />
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div>
            {quote ? (
              <blockquote className="text-sm text-primary">
                “{quote.quote}”
                <span className="mt-1 block text-xs text-secondary">
                  {quote.author}
                  {quote.company ? `, ${quote.company}` : ""}
                </span>
              </blockquote>
            ) : null}

            {/* The promise, stated before the ask rather than after it. */}
            <p className="mt-3 text-xs text-secondary">
              Every enquiry gets a real reply from me within {replyWindow}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
