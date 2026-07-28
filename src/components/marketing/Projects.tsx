"use client";

import Image from "next/image";
import Link from "next/link";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { Reveal } from "@/components/motion/Reveal";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { cn } from "@/lib/utils";

/**
 * Projects — the homepage featured grid.
 *
 * Asymmetric: the first card spans two columns. Images scale inside a fixed
 * frame with overflow hidden, so the frame itself never moves and no layout
 * is invalidated during the transition.
 *
 * Renders nothing at all when there are no published projects, rather than an
 * empty grid or a placeholder.
 */

type ProjectsProps = {
  preloaded: Preloaded<typeof api.projects.listFeatured>;
};

export function Projects({ preloaded }: ProjectsProps) {
  const projects = usePreloadedQuery(preloaded);

  // Empty state: the section does not exist.
  if (!projects || projects.length === 0) return null;

  return (
    <section
      aria-labelledby="work-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <Reveal>
        <div className="flex items-baseline justify-between">
          <h2 id="work-heading" className="text-3xl">
            Featured work
          </h2>
          <Link
            href="/work"
            data-cursor="link"
            className="text-sm text-secondary transition-colors duration-fast hover:text-primary"
          >
            All work
          </Link>
        </div>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {projects.map((project: Project, index: number) => (
          <Reveal
            key={project._id}
            delay={index * 0.08}
            // First card spans both columns.
            className={cn(index === 0 && "sm:col-span-2")}
          >
            <ProjectCard project={project} wide={index === 0} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Shape consumed by the card. The generated Convex type is a superset. */
export type Project = {
  _id: string;
  slug: string;
  title: string;
  client: string;
  year: number;
  category: string;
  coverUrl?: string;
  result?: string;
  summary: string;
};

export function ProjectCard({
  project,
  wide = false,
}: {
  project: Project;
  wide?: boolean;
}) {
  return (
    <Link
      href={`/work/${project.slug}`}
      data-cursor="view"
      className="project-card group block h-full overflow-hidden rounded-xl"
    >
      {/* Fixed frame; only the image inside it scales, so no layout moves. */}
      <ImageReveal
        className={cn(
          "relative w-full overflow-hidden bg-surface-2",
          wide ? "aspect-[2/1]" : "aspect-[3/2]",
        )}
      >
        {project.coverUrl ? (
          <Image
            src={project.coverUrl}
            alt=""
            fill
            sizes={
              wide
                ? "(max-width: 640px) 100vw, 960px"
                : "(max-width: 640px) 100vw, 480px"
            }
            className="object-cover object-top transition-transform duration-slow ease-out-expo group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : null}

        {/* Keeps the metadata legible over a bright screenshot. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[color:var(--bg-surface-1)] to-transparent"
        />
      </ImageReveal>

      <div className="bg-surface-1 p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-base text-primary">{project.title}</h3>
          <span className="shrink-0 text-xs text-secondary tabular-nums">
            {project.year}
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
        </div>
      </div>
    </Link>
  );
}
