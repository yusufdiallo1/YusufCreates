"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * AmbientTemperature — the page warms as you descend it.
 *
 * A single fixed gradient behind everything, drifting from a cool tone at the
 * top through neutral to a warmer one by the contact band. It is what makes a
 * long page feel like a journey rather than a list of sections.
 *
 * IT WORKS BECAUSE NOBODY NOTICES IT. Total hue travel under 20 degrees and
 * opacity under 0.06 — the change should only be apparent if you scroll back
 * up to check. Turn either dial past that and it stops being atmosphere and
 * starts being a colour effect the reader has to look past.
 *
 * ONE LAYER FOR THE WHOLE PAGE. Per-section backgrounds band visibly at their
 * boundaries; a single element cannot.
 */
export function AmbientTemperature() {
  const { tier } = useCapability();
  const { scrollYProgress } = useScroll();

  // Cool blue-violet → neutral → warm amber. 214° to 32° the short way round
  // is a 18° journey through the neutral point rather than a 182° sweep
  // through green, which is why the midpoint is specified.
  const background = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [
      "radial-gradient(120% 80% at 50% 0%, rgba(94,106,210,0.055), transparent 70%)",
      "radial-gradient(120% 80% at 50% 30%, rgba(140,130,190,0.04), transparent 70%)",
      "radial-gradient(120% 80% at 50% 100%, rgba(224,164,88,0.05), transparent 70%)",
    ],
  );

  if (tier === "minimal") return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        background: tier === "full" ? background : undefined,
        position: "fixed",
        inset: 0,
        // Behind everything, including the canvas content.
        zIndex: -1,
        pointerEvents: "none",
      }}
      className={tier === "full" ? undefined : "ambient-temperature-static"}
    />
  );
}
