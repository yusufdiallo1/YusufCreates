"use client";

import { Reveal } from "@/components/motion/Reveal";
import { SpotlightGroup } from "@/components/motion/Spotlight";
import { SKILL_GROUPS, type Skill } from "@/lib/skills";
import { TechLogo } from "@/components/ui/TechLogos";

/**
 * Skills — grouped capability list.
 *
 * Every skill that names a real product links to that product's own docs or
 * homepage, opening in a new tab. Someone reading a stack list is often doing
 * so because they do not recognise half of it, and making them go and search
 * for "Convex" is a worse answer than a link.
 *
 * Marks are inline SVG paths from simple-icons rather than images — crisp at
 * any size, no network request, no trademark licensing question. They are
 * imported one brand at a time; see TechLogos for why that matters.
 */

/**
 * Single row. Also reused for a case study's tech stack.
 *
 * Renders as an <a> when the skill has a url and a <div> when it does not,
 * rather than always being an anchor with a dead href. A link that goes
 * nowhere is worse than plain text: it takes a tab stop, announces itself as a
 * link to a screen reader, and then does nothing.
 *
 * The row stacks on narrow columns and only goes name-left / use-right once
 * there is room. Forcing the two onto one line inside a card column squeezed
 * the description into a two-word-per-line ribbon.
 */
export function SkillChip({
  skill,
  index = 0,
}: {
  skill: Skill;
  index?: number;
}) {
  const content = (
    <>
      {/* The mark sits in a fixed box whether or not there is one to show,
          so names stay aligned down the column. Only marks that can be
          reproduced exactly exist — see TechLogos. */}
      <span className="flex shrink-0 items-center gap-2.5 text-sm text-primary">
        <span
          aria-hidden="true"
          className="flex size-4 shrink-0 items-center justify-center text-secondary transition-transform duration-hover ease-hover group-hover:scale-110"
        >
          <TechLogo name={skill.name} size={16} />
        </span>
        {skill.name}
        {/* Only on linked rows, and only on hover — a permanent arrow on every
            row turns the column into a list of chevrons. */}
        {skill.url ? (
          <span
            aria-hidden="true"
            className="-ml-1 translate-x-0 text-xs text-accent opacity-0 transition-[opacity,transform] duration-hover ease-hover group-hover:translate-x-1 group-hover:opacity-100"
          >
            ↗
          </span>
        ) : null}
      </span>
      {skill.use ? (
        <span className="skill-row-use min-w-0 pl-[26px] text-xs text-secondary transition-colors duration-hover ease-hover group-hover:text-primary">
          {skill.use}
        </span>
      ) : null}
    </>
  );

  /*
   * Always stacked, never name-left / description-right.
   *
   * The two-column split is a viewport-width idea, and these rows do not live
   * at viewport width — they live inside a card that is roughly 300px across,
   * where right-aligning the description ragged it into three-word lines with
   * a gutter down the middle. Stacked, each row is a name and a caption, which
   * is what it actually is.
   *
   * pl on the caption aligns it under the name rather than under the mark:
   * 16px glyph + 10px gap.
   */
  const shared =
    "skill-row group -mx-2 flex w-full flex-col gap-1 rounded-lg px-2 py-2.5 transition-colors duration-hover ease-hover";

  return (
    <Reveal delay={Math.min(index * 0.03, 0.3)} className="w-full">
      {skill.url ? (
        <a
          href={skill.url}
          target="_blank"
          /* noreferrer alongside noopener: noopener alone still leaks the
             referring URL, and these are third-party sites. */
          rel="noopener noreferrer"
          data-cursor="link"
          aria-label={`${skill.name} — opens in a new tab`}
          className={`${shared} hover:bg-surface-2/60 focus-visible:bg-surface-2/60`}
        >
          {content}
        </a>
      ) : (
        <div data-cursor="link" className={shared}>
          {content}
        </div>
      )}
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

      {/*
        Each group is a panel rather than a bare column of hairline rows.

        The old version was deliberately flat — "let type and spacing do the
        work" — but with six groups of different lengths flowing through a
        two-column grid, the group headings stopped reading as headings and the
        whole section became one undifferentiated list of twenty-five rows. An
        edge per group is what makes the grouping visible at a glance.

        CSS COLUMNS, NOT GRID. The groups are wildly uneven — Frontend has
        eleven rows, Growth has one — and in a grid every card in a row
        stretches to the tallest, so "Growth" became a mostly-empty panel as
        tall as eleven skills. Columns let each card be its own height and pack
        the next one underneath, which is the behaviour this content wants.
        break-inside-avoid stops a card being split across a column boundary.

        The count is worth showing: it turns a heading into a fact.
      */}
      <SpotlightGroup className="mt-16 gap-4 [column-fill:balance] sm:columns-2 lg:columns-3">
        {SKILL_GROUPS.map((group, groupIndex) => (
          <div key={group.heading} className="mb-4 break-inside-avoid">
            <Reveal delay={Math.min(groupIndex * 0.06, 0.3)}>
              <div
                data-spotlight=""
                className="hairline rounded-2xl bg-surface-1/50 p-5 transition-colors duration-hover ease-hover hover:border-[color:var(--border-glass)]"
              >
                <div className="hairline-b flex items-baseline justify-between gap-3 pb-3">
                  <h3 className="font-mono text-xs tracking-[0.08em] text-secondary uppercase">
                    {group.heading}
                  </h3>
                  <span className="font-mono text-xs text-muted tabular-nums">
                    {group.items.length}
                  </span>
                </div>

                <ul className="mt-1">
                  {group.items.map((skill, index) => (
                    <li key={skill.name} className="flex">
                      <SkillChip skill={skill} index={index} />
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        ))}
      </SpotlightGroup>
    </section>
  );
}
