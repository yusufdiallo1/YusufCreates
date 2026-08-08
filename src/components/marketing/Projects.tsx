"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { Reveal } from "@/components/motion/Reveal";
import { SharedElement, sharedNames } from "@/components/motion/SharedElement";
import { PhoneMockup } from "@/components/ui/PhoneMockup";
import { Tilt } from "@/components/motion/Tilt";
import { cn } from "@/lib/utils";
import { useEntryContext } from "@/components/providers/EntryStateProvider";

/**
 * Projects — a scroll-driven showcase.
 *
 * The section pins and the track travels sideways: one panel per project,
 * copy on the left and the product on the right, moving with the scroll rather
 * than swapping underneath it.
 *
 * It crossfaded in place before — pinned panel, content swapped by scroll
 * progress — which reads as a slideshow wired to the wheel. Moving the track
 * means the gesture and the thing on screen point the same way.
 *
 * Reduced motion and small screens both fall back to an ordinary stacked list,
 * because pinning depends on the viewport being tall enough to hold the panel
 * and on movement being welcome in the first place.
 */

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
            className="inline-flex min-h-6 items-center text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
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
 * Phone screenshots, by slug.
 *
 * Explicit rather than derived from the slug, because a convention like
 * `/work/{slug}-phone.png` 404s silently for every project that has not been
 * shot yet — and most have not. A missing key here simply falls back to the
 * cover, which is the honest behaviour: this site itself is a desktop piece
 * of work and putting it in a phone would misrepresent it.
 *
 * When enough projects have one, this belongs on the projects table as an
 * optional phoneUrl. Three does not justify a migration.
 */
const PHONE_SHOTS: Record<string, string> = {
  "docutrackr-family": "/work/docutrackr-family-phone.png",
  "docutrackr-business": "/work/docutrackr-business-phone.png",
  "the-curated-route": "/work/curated-route-phone.png",
};

/**
 * The pinned variant. One viewport of scroll per project drives the range, and
 * the track travels SIDEWAYS across it.
 *
 * It used to crossfade in place: the panel was pinned and the content swapped
 * underneath it. That reads as a slideshow that happens to be wired to the
 * wheel. Moving the track instead means the scroll gesture and the thing on
 * screen point the same way, so the page feels dragged rather than stepped.
 *
 * The travel is expressed as a PERCENTAGE of the track rather than in pixels,
 * so nothing has to be measured and nothing has to be re-measured on resize.
 * The track is one panel per project, each the full width of the container, so
 * moving it by (n-1)/n of its own width lands exactly on the last panel.
 */
function PinnedShowcase({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const travel = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", `-${((projects.length - 1) / projects.length) * 100}%`],
  );
  /* Smoothed, so the track glides instead of tracking wheel jitter exactly.
     Same shape as ScrollProgress uses, for the same reason. */
  const x = useSpring(travel, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div
      ref={ref}
      className="relative mt-8"
      /*
       * One viewport of scroll per project. Any less and a panel is gone
       * before it has been read; any more and it feels like the page stalled.
       *
       * dvh, not vh: on mobile Safari vh is the tallest possible viewport, so
       * the container is taller than what is actually on screen and the last
       * project never reaches full progress.
       */
      style={{ height: `${projects.length * 100}dvh` }}
    >
      <div className="sticky top-0 flex h-[100dvh] items-center">
        {/*
          The clip lives INSIDE the sticky element, not around it.
          `overflow: hidden` on an ancestor makes that ancestor the scroll
          container, and a sticky descendant then sticks to it rather than to
          the viewport — which is to say, it stops sticking at all.
        */}
        <div className="w-full overflow-hidden">
          {/*
            The track is explicitly n panels WIDE, and that is what makes the
            percentage travel correct.

            A percentage x translates against the element's OWN width. With
            `w-full` the track measured one container across — the shrink-0
            panels overflowed it rather than widening it — so -75% moved 75% of
            ONE panel and the run ended around the second project. Sizing the
            track to n × 100% and each panel to 100/n of it means -(n-1)/n
            lands exactly on the last one, still without measuring anything.
          */}
          <motion.div
            style={{ x, width: `${projects.length * 100}%` }}
            className="flex"
          >
            {projects.map((p, i) => (
              <ShowcasePanel
                key={p.slug}
                project={p}
                index={i}
                total={projects.length}
                priority={i === 0}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * One project, filling the width of the track.
 *
 * shrink-0 is load-bearing: these are flex children of a track that is itself
 * only as wide as the container, so without it they would compress to a fifth
 * of a screen each rather than queueing up off to the right.
 */
function ShowcasePanel({
  project,
  index,
  total,
  priority,
}: {
  project: Project;
  index: number;
  total: number;
  priority: boolean;
}) {
  const phone = PHONE_SHOTS[project.slug];
  /*
   * Not every featured project has a picture — this site's own entry has an
   * empty coverUrl. Reserving the media half anyway left a panel that was
   * fifty per cent void and read as a failed image load rather than a
   * deliberate layout, so the copy takes the whole panel instead.
   */
  const hasMedia = Boolean(phone || project.coverUrl);

  return (
    <div
      className="flex shrink-0 items-center gap-12 px-1"
      /* A share of the track, not of the viewport — see the note on the track
         itself. shrink-0 so this width is honoured rather than negotiated. */
      style={{ width: `${100 / total}%` }}
    >
      {/* Centred when there is no media, so the panel reads as a deliberate
          statement rather than as a split layout missing its right half. */}
      <div className={cn("min-w-0", hasMedia ? "flex-1" : "mx-auto max-w-2xl")}>
        <p className="text-xs tracking-[0.18em] text-secondary uppercase">
          {project.category}
        </p>

        <h3 className="mt-5 text-4xl leading-[1.05] text-primary">
          {project.title}
        </h3>

        <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
          {project.result ?? project.summary}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
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

        {/*
          Position, not navigation. The rail that used to be here was a list of
          links to every project, which duplicated the "View case study" above
          and gave a keyboard user five targets per panel to tab past. These are
          aria-hidden dots; the accessible route through the work is the link
          above and /work.
        */}
        <div aria-hidden="true" className="mt-10 flex items-center gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-slow",
                i === index
                  ? "w-6 bg-[color:var(--accent)]"
                  : "w-1 bg-[color:var(--border-hairline)]",
              )}
            />
          ))}
        </div>
      </div>

      {/* Media column. A phone for the products that are phone products; the
          cover for anything else. Absent entirely when there is neither,
          rather than an empty box holding open half a panel. */}
      <div
        className={cn("shrink-0 justify-center", hasMedia ? "flex" : "hidden")}
      >
        {phone ? (
          <Link
            href={`/work/${project.slug}`}
            aria-label={`${project.title} — view case study`}
            tabIndex={-1}
          >
            <PhoneMockup
              src={phone}
              alt={`${project.title} on a phone`}
              priority={priority}
            />
          </Link>
        ) : project.coverUrl ? (
          <Link
            href={`/work/${project.slug}`}
            aria-label={`${project.title} — view case study`}
            tabIndex={-1}
            className="relative block overflow-hidden rounded-xl bg-surface-2"
            /* Shorter than the phone deliberately. At the phone's height a
               16:10 cover is nearly a thousand pixels wide and leaves the
               copy beside it a column too narrow to set type in. */
            style={{ height: "min(46dvh, 400px)", aspectRatio: "16 / 10" }}
          >
            <Image
              src={project.coverUrl}
              alt={project.title}
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-top"
              priority={priority}
            />
          </Link>
        ) : null}
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
    /*
     * Tilt on the outside, the card's own lift on the inside.
     *
     * The two are doing different jobs and compose rather than fight: the lift
     * says "this is pressable", the tilt says "this is a pane". Tilt puts the
     * perspective on a wrapper and rotates a child, so the card's translate
     * lives inside the 3D context rather than replacing it.
     *
     * Tilt takes itself out entirely on touch and on the reduced tiers — it is
     * gated on `canHover`, so a phone renders a plain div and the card behaves
     * exactly as it did before.
     */
    <Tilt className="h-full rounded-xl">
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
          }`}
        >
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

        <div
          className={`bg-surface-1 p-5 ${wide ? "sm:flex sm:flex-col sm:justify-center sm:p-8" : ""}`}
        >
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
    </Tilt>
  );
}
