"use client";

import Image from "next/image";
import Link from "next/link";
import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import {
  SharedElement,
  sharedNames,
} from "@/components/motion/SharedElement";
import { ScaleToFullbleed } from "@/components/motion/ScaleToFullbleed";
import { CountUp } from "@/components/motion/CountUp";
import { SkillChip } from "@/components/marketing/Skills";

type Project = {
  _id: string;
  _creationTime: number;
  slug: string;
  title: string;
  client: string;
  year: number;
  category: string;
  coverUrl?: string;
  gallery?: string[];
  summary: string;
  problem?: string;
  process?: string;
  result?: string;
  metrics?: {
    label: string;
    value: number;
    suffix?: string;
    decimals?: number;
  }[];
  techStack?: string[];
  liveUrl?: string;
};

export function CaseStudy({
  project,
  preloadedAll,
}: {
  project: Project;
  preloadedAll: Preloaded<typeof api.projects.listPublished>;
}) {
  const all = usePreloadedQuery(preloadedAll);

  // Next project, wrapping round to the start.
  const index = all?.findIndex((p: { slug: string }) => p.slug === project.slug) ?? -1;
  const next =
    all && all.length > 1 && index >= 0
      ? all[(index + 1) % all.length]
      : undefined;

  return (
    <article className="mx-auto max-w-3xl px-6 py-24">
      {/* 1. Hero */}
      <header>
        <TextReveal as="h1" by="word" className="block text-4xl">
          {project.title}
        </TextReveal>

        <Reveal delay={0.1}>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-secondary">
            <div>
              <dt className="sr-only">Client</dt>
              <dd>{project.client}</dd>
            </div>
            <div>
              <dt className="sr-only">Year</dt>
              <dd>{project.year}</dd>
            </div>
            <div>
              <dt className="sr-only">Role</dt>
              <dd>{project.category}</dd>
            </div>
            {project.liveUrl ? (
              <div>
                <dt className="sr-only">Live site</dt>
                <dd>
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    data-cursor="link"
                    className="text-accent hover:text-primary"
                  >
                    Visit live site
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </Reveal>
      </header>

      {project.coverUrl ? (
        /* The page's one scrubbed sequence: the cover grows from a rounded
           slab to fill the frame as you scroll into the study. Registered
           against the scrub budget, so nothing else on this page can claim
           it. Parallax is dropped here — two scroll-linked transforms on the
           same element fight each other. */
        <ScaleToFullbleed className="mt-12">
          <div className="hairline relative aspect-[2/1] overflow-hidden rounded-lg bg-surface-1">
            {/* The other end of the morph. Same name as the grid card's cover,
                so the browser animates one image between two positions. */}
            <SharedElement name={sharedNames.projectCover(project.slug)}>
              <Image
                src={project.coverUrl}
                alt={`${project.title} cover`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </SharedElement>
          </div>
        </ScaleToFullbleed>
      ) : null}

      {/* 2. The problem */}
      {project.problem ? (
        <section className="mt-16">
          <TextReveal as="h2" by="word" className="block text-2xl">
            The problem
          </TextReveal>
          <Reveal delay={0.08}>
            <p className="mt-4 text-secondary">{project.problem}</p>
          </Reveal>
        </section>
      ) : null}

      {/* 3. What I built */}
      {project.process ? (
        <section className="mt-16">
          <TextReveal as="h2" by="word" className="block text-2xl">
            What I built
          </TextReveal>
          <Reveal delay={0.08}>
            <p className="mt-4 text-secondary">{project.process}</p>
          </Reveal>

          {project.gallery && project.gallery.length > 0 ? (
            <div className="mt-8 space-y-8">
              {project.gallery.map((src, i) => (
                <Parallax key={src} distance={i % 2 === 0 ? 24 : -24}>
                  <div className="hairline relative aspect-[3/2] overflow-hidden rounded-lg bg-surface-1">
                    <Image
                      src={src}
                      alt={`${project.title} process image ${i + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover"
                    />
                  </div>
                </Parallax>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 4. The result */}
      {project.result || project.metrics?.length ? (
        <section className="mt-16">
          <TextReveal as="h2" by="word" className="block text-2xl">
            The result
          </TextReveal>

          {project.result ? (
            <Reveal delay={0.08}>
              <p className="mt-4 text-secondary">{project.result}</p>
            </Reveal>
          ) : null}

          {project.metrics && project.metrics.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {project.metrics.map((metric, i) => (
                <Reveal key={metric.label} delay={i * 0.08}>
                  <div className="surface-1 p-6">
                    <p className="text-3xl">
                      <CountUp
                        value={metric.value}
                        decimals={metric.decimals ?? 0}
                        suffix={metric.suffix ?? ""}
                      />
                    </p>
                    <p className="mt-1 text-sm text-secondary">
                      {metric.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 5. Tech stack — reuses the Skills chip */}
      {project.techStack && project.techStack.length > 0 ? (
        <section className="mt-16">
          <TextReveal as="h2" by="word" className="block text-2xl">
            Tech stack
          </TextReveal>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {project.techStack.map((tech, i) => (
              <li key={tech} className="flex">
                <SkillChip skill={{ name: tech, use: "" }} index={i} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 6. Next project */}
      {next ? (
        <Reveal className="mt-24">
          <Link
            href={`/work/${next.slug}`}
            data-cursor="view"
            className="hairline-t block pt-8"
          >
            <span className="text-sm text-secondary">Next project</span>
            <span className="mt-2 block text-2xl text-primary">
              {next.title}
            </span>
          </Link>
        </Reveal>
      ) : null}
    </article>
  );
}
