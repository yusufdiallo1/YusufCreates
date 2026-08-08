"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { Reveal } from "@/components/motion/Reveal";
import {
  SharedElement,
  sharedNames,
} from "@/components/motion/SharedElement";
import { cn } from "@/lib/utils";
import { useEntryContext } from "@/components/providers/EntryStateProvider";

/**
 * Projects — a scroll-driven showcase.
 *
 * The old asymmetric grid gave the first project a full-width 2:1 frame, which
 * on a wide screen made a single card taller than the viewport and left the
 * section feeling broken. This replaces it with a pinned panel: the media stays
 * fixed while the page scrolls, and the active project changes underneath it.
 *
 * Scroll position is the only source of truth for which project is active. The
 * text and image crossfade together, so the pairing can never drift.
 *
 * Reduced motion and small screens both fall back to an ordinary stacked list,
 * because pinning depends on the viewport being tall enough to hold the panel
 * and on movement being welcome in the first place.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/** Shape consumed by the card. The generated Convex type is a superset. */
export type Project = {
  _id: string;
  /** Convex's own insertion timestamp. Drives the "New" marker. */
  _creationTime: number;
  slug: string;
  title: string;
  client: string;
  year: number;
  category: string;
  coverUrl?: string;
  result?: string;
  summary: string;
  liveUrl?: string;
};

type ProjectsProps = {
  preloaded: Preloaded<typeof api.projects.listFeatured>;
};

export function Projects({ preloaded }: ProjectsProps) {
  const projects = usePreloadedQuery(preloaded) as Project[] | undefined;

  // Empty state: the section does not exist.
  if (!projects || projects.length === 0) return null;

  return (
    /* py-16, the tightest section on the page.
       This is beat 2 now — the first thing after the hero — and it is meant to
       read dense and fast. Generous padding here would make the proof feel
       like a leisurely gallery when the job is to answer "is this any good"
       before the visitor has decided to leave. */
    <section
      id="work"
      aria-labelledby="work-heading"
      className="mx-auto max-w-6xl px-6 py-16"
    >
      <Reveal>
        <div className="flex items-baseline justify-between">
          <h2 id="work-heading" className="text-3xl">
            Featured work
          </h2>
          <Link
            href="/work"
            className="text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
          >
            All work
          </Link>
        </div>
      </Reveal>

      {/*
        BOTH VARIANTS ALWAYS RENDER. Which one shows is decided by CSS.

        This used to be `reduceMotion ? <StackedList/> : <>…</>`, which chose
        between two different subtrees from a hook that is null on the server
        and a boolean on the client — so a reduced-motion visitor hydrated the
        featured-work section against markup the server never sent, and React
        discarded it.

        The reduced branch was always a subset of the other one anyway: the
        non-reduced path already renders StackedList for narrow viewports. So
        there is nothing to choose. Both are in the DOM, the breakpoint decides
        on a normal visit, and the reduced-motion media query in globals.css
        overrides the breakpoint to force the stacked list. See there.
      */}
      {/* Pinning needs viewport height to work against, so it is desktop
          only. Phones get the stacked list, which is also what the
          reduced-motion path renders. */}
      <div className="lg:hidden" data-projects-stacked>
        <StackedList projects={projects} />
      </div>
      <div className="hidden lg:block" data-projects-pinned>
        <PinnedShowcase projects={projects} />
      </div>
    </section>
  );
}

/**
 * The pinned variant. One tall spacer per project drives the scroll range;
 * the panel sits sticky inside it.
 */
function PinnedShowcase({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    // Map progress onto an index. Clamped because scroll can overshoot at
    // both ends, and a rubber-band bounce must not select a project that
    // does not exist.
    const next = Math.min(
      projects.length - 1,
      Math.max(0, Math.floor(p * projects.length)),
    );
    // Guarded so a scroll event that lands in the same band does not
    // re-render on every frame.
    setActive((current) => (current === next ? current : next));
  });

  const project = projects[active];

  return (
    <div
      ref={ref}
      className="relative mt-8"
      /*
       * One viewport of scroll per project. Any less and the crossfades run
       * into each other; any more and it feels like the page has stalled.
       *
       * dvh, not vh: on mobile Safari vh is the tallest possible viewport, so
       * the container is taller than what is actually on screen and the last
       * project never reaches full progress.
       */
      style={{ height: `${projects.length * 100}dvh` }}
    >
      {/*
       * Offset by the heading's height rather than sticking to top-0.
       *
       * At top-0 with h-screen the panel centres itself in the full viewport,
       * which sits BELOW the heading that is already occupying the top of the
       * section — leaving most of a screen of dead space before the first card
       * appears. Sticking below the heading and subtracting it from the height
       * centres the panel in the space that is actually free.
       */}
      {/*
       * min-h with a cap, not a fixed h-screen box.
       *
       * A full-height container centring content that is only about half that
       * tall leaves a large void above and below the card. Sizing to the
       * content and capping it keeps the panel pinned without the panel being
       * mostly empty.
       */}
      <div className="sticky top-24 flex max-h-[calc(100dvh-7rem)] items-start py-4">
        <div className="grid w-full grid-cols-12 items-center gap-10">
          {/* Text column. Keyed on slug so Motion treats each project as a
              new element and runs the exit animation. */}
          <div className="col-span-4">
            <motion.div
              key={project.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <p className="text-xs text-secondary tabular-nums">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(projects.length).padStart(2, "0")}
              </p>

              <h3 className="mt-5 text-3xl text-primary">{project.title}</h3>

              <p className="mt-4 text-sm text-secondary">
                {project.result ?? project.summary}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color:var(--border-hairline)] px-2.5 py-1 text-xs text-secondary">
                  {project.category}
                </span>
                <span className="text-xs text-secondary">{project.client}</span>
                <span className="text-xs text-secondary tabular-nums">
                  {project.year}
                </span>
              </div>

              <Link
                href={`/work/${project.slug}`}
                className="mt-8 inline-block text-sm text-accent transition-colors duration-hover ease-hover hover:text-primary"
              >
                View case study
              </Link>
            </motion.div>

            {/* Progress rail. Also the accessible way to jump between
                projects without scrolling — each is a real link. */}
            <ol className="mt-10 space-y-1">
              {projects.map((p, i) => (
                <li key={p.slug}>
                  <Link
                    href={`/work/${p.slug}`}
                    className={cn(
                      "flex items-center gap-3 py-1 text-xs transition-colors duration-hover ease-hover",
                      i === active
                        ? "text-primary"
                        : "text-secondary hover:text-primary",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-px transition-all duration-slow",
                        i === active
                          ? "w-8 bg-[color:var(--accent)]"
                          : "w-4 bg-[color:var(--border-hairline)]",
                      )}
                    />
                    {p.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          {/* Media column. Every image stays mounted and opacity does the
              work — mounting on scroll would decode mid-transition and flash
              an empty frame. */}
          <div className="col-span-8">
            {/* Height-driven, not aspect-driven.
                aspect-[16/10] derives height from width, so on a wide viewport
                the box grew past the pinned panel and the screenshot was cut
                off at the fold. Fixing the height and letting object-cover
                crop keeps the whole card on screen. */}
            <div className="relative h-[min(52dvh,26rem)] w-full overflow-hidden rounded-xl bg-surface-2">
              {projects.map((p, i) => (
                <motion.div
                  key={p.slug}
                  className="absolute inset-0"
                  initial={false}
                  animate={{
                    opacity: i === active ? 1 : 0,
                    scale: i === active ? 1 : 1.03,
                  }}
                  transition={{ duration: 0.6, ease: EASE }}
                  style={{ pointerEvents: i === active ? "auto" : "none" }}
                >
                  <Link
                    href={`/work/${p.slug}`}
                    aria-hidden={i !== active}
                    tabIndex={i === active ? 0 : -1}
                    /* `relative` is load-bearing, not cosmetic: next/image
                       with `fill` absolutely positions itself against the
                       nearest positioned ancestor, and this Link sat at
                       `static` — so the cover resolved against the section
                       instead of the card and Next logged a warning for every
                       featured project on first paint. */
                    className="relative block h-full w-full"
                  >
                    {p.coverUrl ? (
                      <Image
                        src={p.coverUrl}
                        alt={p.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 66vw"
                        className="object-cover object-top"
                        priority={i === 0}
                      />
                    ) : null}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fallback for phones and reduced motion: a plain, evenly sized list. */
function StackedList({ projects }: { projects: Project[] }) {
  return (
    <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
      {projects.map((project, index) => (
        <Reveal key={project._id} delay={index * 0.08}>
          <ProjectCard project={project} />
        </Reveal>
      ))}
    </div>
  );
}

/**
 * Used by the stacked fallback and by /work. Deliberately one uniform aspect
 * ratio — the old variant let the first card grow taller than the viewport.
 */
export function ProjectCard({
  project,
  /**
   * The lead card on /work, which spans both columns.
   *
   * Side by side rather than simply bigger: at full width a 3:2 image is
   * enormous and pushes the text off the fold, so the extra room goes
   * sideways. Everything inside is unchanged — only the axis differs.
   */
  wide = false,
}: {
  project: Project;
  wide?: boolean;
}) {
  /*
   * "New" — published since they were last here.
   *
   * Only ever shown to a returning visitor, and only for work they cannot
   * have seen. On a first visit everything is new, so marking anything would
   * be noise; lastVisitAt is 0 then and the comparison is false for every
   * card, which is the behaviour without a special case.
   *
   * The marker is rendered in EVERY state and hidden with CSS rather than
   * conditionally mounted. Entry state resolves one commit after hydration,
   * and inserting a node then would reflow the card grid under the reader —
   * see THE SSR RULE in lib/entryState.ts.
   */
  const { lastVisitAt } = useEntryContext();
  const isNew = lastVisitAt > 0 && project._creationTime > lastVisitAt;

  return (
    <Link
      href={`/work/${project.slug}`}
      data-spotlight=""
      className={`project-card group relative block h-full overflow-hidden rounded-xl transition-transform duration-hover ease-hover hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${
        wide ? "sm:grid sm:grid-cols-[1.35fr_1fr] sm:items-stretch" : ""
      }`}
    >
      <div /* transform-gpu on the clipping box as well as the image: the
                clip and the thing being clipped have to composite on the
                same layer, or their edges disagree by a fraction of a pixel
                for the length of the transition. */
            className={`relative w-full transform-gpu overflow-hidden bg-surface-2 ${
              wide ? "aspect-[3/2] sm:h-full sm:aspect-auto" : "aspect-[3/2]"
            }`}>
        {project.coverUrl ? (
          /* Paired with the same name on the case study hero, so the card
             becomes the hero rather than the two cross-fading. */
          <SharedElement name={sharedNames.projectCover(project.slug)}>
            <Image
              src={project.coverUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="transform-gpu object-cover object-top transition-transform duration-hover ease-hover group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          </SharedElement>
        ) : (
          /*
            A project with no cover used to render a bare grey rectangle, which
            is indistinguishable from an image that failed to load — and that
            is exactly how it was being read. This says "no screenshot yet"
            rather than saying nothing.
          */
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[color:var(--bg-surface-2)] to-[color:var(--bg-surface-1)]">
            <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
              {project.category ?? "Case study"}
            </span>
          </div>
        )}

        {/* Keeps the metadata legible over a bright screenshot. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[color:var(--bg-surface-1)] to-transparent"
        />
      </div>

      <div className={`bg-surface-1 p-5 ${wide ? "sm:flex sm:flex-col sm:justify-center sm:p-8" : ""}`}>
        <div className="flex items-baseline justify-between gap-4">
          {/* Deliberately NOT a shared element. The case study heading is a
              TextReveal, which splits the title into per-word spans and
              animates them independently — morphing a single <h3> into that
              means the browser tweens one box toward a box whose contents are
              simultaneously moving, and the result reads as a glitch rather
              than as continuity. The cover carries the connection on its own. */}
          <h3 className="text-base text-primary">{project.title}</h3>
          <span className="flex shrink-0 items-center gap-2">
            {/* Quiet on purpose. It is a courtesy to someone who has been
                here before, not a badge competing with the work. */}
            <span
              aria-hidden={!isNew}
              className={
                isNew
                  ? "rounded-full bg-accent/15 px-2 py-0.5 text-[10px] tracking-[0.06em] text-accent uppercase"
                  : "hidden"
              }
            >
              New
            </span>
            <span className="text-xs text-secondary tabular-nums">
              {project.year}
            </span>
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-secondary">
          {project.result ?? project.summary}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:var(--border-hairline)] px-2.5 py-1 text-xs text-secondary">
            {project.category}
          </span>
          <span className="text-xs text-secondary">{project.client}</span>

          {/* A marker, not a link — the whole card is already an anchor to the
              case study, and an <a> inside an <a> is invalid. Saying the site
              is live is the useful part; the case study carries the link. */}
          {project.liveUrl ? (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-accent">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent"
              />
              Live
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
