"use client";

import { Reveal } from "@/components/motion/Reveal";
import { SKILL_GROUPS, type Skill } from "@/lib/skills";

/**
 * Skills — grouped capability list.
 *
 * Deliberately flat: hairline-separated rows on the canvas rather than glass
 * chips. Resend's restraint comes from letting type and spacing do the work,
 * so a grid of translucent pills reads as decoration competing with the
 * content. The name carries weight, the use line sits quiet beneath it.
 *
 * Text only, no logo images: crisp at any size, no trademark licensing.
 */

/** Single row. Also reused for a case study's tech stack. */
export function SkillChip({
  skill,
  index = 0,
}: {
  skill: Skill;
  index?: number;
}) {
  return (
    <Reveal delay={Math.min(index * 0.03, 0.3)} className="w-full">
      <div
        data-cursor="link"
        className="skill-row group flex w-full items-baseline justify-between gap-4 py-3"
      >
        <span className="text-sm text-primary">{skill.name}</span>
        {skill.use ? (
          <span className="skill-row-use text-right text-xs text-secondary">
            {skill.use}
          </span>
        ) : null}
      </div>
    </Reveal>
  );
}

export function Skills() {
  return (
    <section
      aria-labelledby="skills-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <Reveal>
        <h2 id="skills-heading" className="text-3xl">
          Skills
        </h2>
        <p className="mt-3 max-w-xl text-secondary">
          The tools I reach for, and what I actually use each one to do.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-x-16 gap-y-12 sm:grid-cols-2">
        {SKILL_GROUPS.map((group) => (
          <div key={group.heading}>
            <Reveal>
              <h3 className="text-xs tracking-normal text-secondary uppercase">
                {group.heading}
              </h3>
            </Reveal>

            <ul className="mt-2 divide-y divide-[color:var(--border-hairline)]">
              {group.items.map((skill, index) => (
                <li key={skill.name} className="flex">
                  <SkillChip skill={skill} index={index} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
