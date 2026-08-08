"use client";

import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";
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
  /**
   * Run fast for two circuits on arrival, then ease back to `duration`.
   *
   * The beam is an attention device, and attention is a thing you ask for once.
   * Arriving at speed is what makes the eye go there; staying at speed is what
   * makes it a distraction the reader has to work around for as long as the
   * card is on screen.
   */
  burst?: boolean;
  className?: string;
}

/** Seconds per circuit during the burst. */
const BURST_DURATION = 2.4;
/** How many fast circuits before easing back. */
const BURST_ROTATIONS = 2;

export function BorderBeam({
  duration = 6,
  thickness = 1,
  colour = "var(--accent)",
  delay = 0,
  burst = false,
  className,
}: BorderBeamProps) {
  const { tier } = useCapability();
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  // amount: "some" — the card is taller than a phone viewport, so requiring
  // more of it would mean the beam never bursts on the device most likely to
  // scroll straight past the tier it is marking.
  const inView = useInView(ref, { once: true, amount: "some" });

  /*
   * Written straight to the element rather than held in state.
   *
   * The beam's speed is not something anything else in React needs to know, and
   * routing it through state would re-render the card twice for a value that
   * only ever reaches one CSS custom property. This is an effect doing what an
   * effect is for: pushing a change into an external system.
   */
  useEffect(() => {
    if (!burst || !inView || reduceMotion || tier !== "full") return;
    const node = ref.current;
    if (!node) return;

    // Instant into the burst — the point is that it is already fast by the time
    // you look at it.
    node.style.transition = "none";
    node.style.setProperty("--beam-duration", `${BURST_DURATION}s`);

    const id = window.setTimeout(() => {
      // And a long ease back out, so slowing down is not itself an event.
      node.style.transition = "--beam-duration 1.2s cubic-bezier(0.16,1,0.3,1)";
      node.style.setProperty("--beam-duration", `${duration}s`);
    }, BURST_DURATION * BURST_ROTATIONS * 1000);

    return () => window.clearTimeout(id);
  }, [burst, inView, reduceMotion, tier, duration]);

  // Nothing at minimal — the card's own hairline is enough.
  if (tier === "minimal") return null;

  const animated = tier === "full";

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-border-beam={animated ? "animated" : "static"}
      className={cn("border-beam", className)}
      style={
        {
          /*
           * The VARIABLE changes, not the animation.
           *
           * Rewriting animation-duration restarts the animation, so the beam
           * would snap back to its starting angle every time it changed speed —
           * twice per burst, both times visible. --beam-duration is a registered
           * <time>, so this transitions and the running animation simply plays
           * at a different rate.
           */
          "--beam-duration": `${duration}s`,
          "--beam-thickness": `${thickness}px`,
          "--beam-colour": colour,
          "--beam-delay": `${delay}s`,
        } as React.CSSProperties
      }
    />
  );
}
