"use client";

import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/lib/convex-api";
import { ProjectCard, type Project } from "@/components/marketing/Projects";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";

export function WorkIndex({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.projects.listPublished>;
}) {
  const projects = usePreloadedQuery(preloaded);

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <TextReveal as="h1" by="word" className="block text-4xl">
        Work
      </TextReveal>

      {!projects || projects.length === 0 ? (
        <Reveal delay={0.1}>
          <p className="mt-6 text-secondary">
            Case studies are being written up. Check back shortly.
          </p>
        </Reveal>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {projects.map((project: Project, index: number) => (
            <Reveal key={project._id} delay={index * 0.06}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
