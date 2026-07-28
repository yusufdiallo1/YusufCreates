"use client";

import { Marquee } from "@/components/motion/Marquee";
import { useScrollVelocity } from "@/components/motion/ScrollVelocity";

/**
 * Tech ticker. Scroll velocity feeds the marquee, so the row accelerates while
 * the page moves and eases back to its resting speed when it stops.
 */
export function TechMarquee({ names }: { names: string[] }) {
  const velocity = useScrollVelocity();

  return (
    <section className="hairline-y py-6" aria-label="Tools and technologies">
      <Marquee speed={60} gap={0} velocity={velocity} className="text-secondary">
        {names.map((name) => (
          <span key={name} className="flex items-center whitespace-nowrap">
            <span className="text-lg">{name}</span>
            <span aria-hidden="true" className="px-8 text-lg opacity-40">
              ·
            </span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}
