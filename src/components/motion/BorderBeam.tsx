"use client";

import { cn } from "@/lib/utils";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * BorderBeam — a light travelling around a card's border.
 *
 * An attention device. It works because almost nothing has it: the eye goes to
 * the one moving edge on the screen. Put it on every card and it becomes
 * wallpaper, and the site loses the ability to point at anything.
 *
 * USED IN EXACTLY TWO PLACES: the most-popular pricing tier, and the
 * Enterprise card. If you are adding a third, the answer is almost certainly
 * that one of the existing two should lose it.
 *
 * The beam is a conic gradient rotated by a registered custom property —
 * registration is what makes an angle interpolable, since an unregistered
 * property is a string and CSS cannot animate between two strings. It is then
 * masked to the border only, by compositing a content-box fill out of a
 * padding-box fill.
 *
 * Reduced: a static accent border, no animation. Minimal: nothing at all.
 */

export interface BorderBeamProps {
  /** Seconds for one full circuit. Slower reads as more expensive. */
  duration?: number;
  /** Border thickness in px. */
  thickness?: number;
  /** Any CSS colour. Defaults to the accent. */
  colour?: string;
  /** Seconds to offset the start, for staggering against other beams. */
  delay?: number;
  className?: string;
}

export function BorderBeam({
  duration = 6,
  thickness = 1,
  colour = "var(--accent)",
  delay = 0,
  className,
}: BorderBeamProps) {
  const { tier } = useCapability();

  // Nothing at minimal — the card's own hairline is enough.
  if (tier === "minimal") return null;

  const animated = tier === "full";

  return (
    <span
      aria-hidden="true"
      data-border-beam={animated ? "animated" : "static"}
      className={cn("border-beam", className)}
      style={
        {
          "--beam-duration": `${duration}s`,
          "--beam-thickness": `${thickness}px`,
          "--beam-colour": colour,
          "--beam-delay": `${delay}s`,
        } as React.CSSProperties
      }
    />
  );
}
