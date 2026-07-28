"use client";

import Image from "next/image";
import Link from "next/link";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { Reveal } from "@/components/motion/Reveal";
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
      className="group block focus-ring-inset"
    >
      {/* Fixed frame; only the image inside it scales. */}
      <div
        className={cn(
          "hairline relative w-full overflow-hidden rounded-lg bg-surface-1",
          wide ? "aspect-[2/1]" : "aspect-[3/2]",
        )}
      >
        {project.coverUrl ? (
          <Image
            src={project.coverUrl}
            alt=""
            fill
            sizes={wide ? "(max-width: 640px) 100vw, 960px" : "(max-width: 640px) 100vw, 480px"}
            className="object-cover transition-transform duration-slow ease-out-expo group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <p className="text-primary">{project.title}</p>
        <p className="shrink-0 text-sm text-secondary">{project.year}</p>
      </div>
      <p className="mt-1 text-sm text-secondary">
        {project.client} · {project.category}
      </p>
      <p className="mt-2 text-sm text-secondary">
        {project.result ?? project.summary}
      </p>
    </Link>
  );
}
