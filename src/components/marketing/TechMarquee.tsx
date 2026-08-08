"use client";

import { Marquee } from "@/components/motion/Marquee";
import { useScrollVelocity } from "@/components/motion/ScrollVelocity";
import { TechLogo, hasTechLogo } from "@/components/ui/TechLogos";
import { SKILL_URLS } from "@/lib/skills";

/**
 * Tech ticker. Scroll velocity feeds the marquee, so the row accelerates while
 * the page moves and eases back to its resting speed when it stops.
 */
export function TechMarquee({ names }: { names: string[] }) {
  const velocity = useScrollVelocity();

  return (
    <section className="hairline-y py-6" aria-label="Tools and technologies">
      <Marquee speed={60} gap={0} velocity={velocity} className="text-secondary">
        {names.map((name) => {
          const url = SKILL_URLS[name];

          const content = (
            <>
              {/* The mark only where one can be drawn exactly. The rest run as
                  text, which the row already reads as — this is a ticker of
                  names that some of them happen to have a logo for, not a wall
                  of logos with gaps in it.

                  tech-logo-always: brand colour at rest, not on hover. The
                  hover-to-reveal rule is right for the Skills list and wrong
                  here — this row is moving, so a colour you have to catch is a
                  colour nobody sees. */}
              {hasTechLogo(name) ? (
                <TechLogo
                  name={name}
                  size={18}
                  className="tech-logo-always mr-2.5 shrink-0"
                />
              ) : null}
              <span className="text-lg">{name}</span>
            </>
          );

          return (
            <span key={name} className="flex items-center whitespace-nowrap">
              {/*
                Linked where there is somewhere honest to go.

                Marquee pauses on hover, which is what makes a moving target
                clickable at all — without that this would be a cruel joke.
                "Responsive design" has no product behind it, so it stays plain
                text rather than becoming a link to nowhere.
              */}
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} — opens in a new tab`}
                  className="flex items-center transition-colors duration-hover ease-hover hover:text-primary"
                >
                  {content}
                </a>
              ) : (
                <span className="flex items-center">{content}</span>
              )}

              <span aria-hidden="true" className="px-8 text-lg opacity-40">
                ·
              </span>
            </span>
          );
        })}
      </Marquee>
    </section>
  );
}
