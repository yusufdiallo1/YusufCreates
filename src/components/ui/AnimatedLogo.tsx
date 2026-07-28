"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { FONT_STACK } from "./Logo";

/**
 * AnimatedLogo — the wordmark, with the Y mark assembling itself.
 *
 * On the landing the two strokes rotate in from opposing angles, overshoot
 * slightly, then settle into place while the cursor block blinks. It plays
 * once per session so returning visitors are not made to watch it again.
 *
 * The mark geometry is identical to Logo.tsx — same paths, same stroke width,
 * same square caps and mitred joins — so the deliberate gap between the
 * chevron tip and the arm is preserved.
 *
 * Under reduced motion it renders the resting state immediately.
 */

const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";
const SESSION_KEY = "yc-animated-logo-played";
const EASE = [0.16, 1, 0.3, 1] as const;

interface AnimatedLogoProps {
  className?: string;
  /** Play the assemble sequence. Off in the nav, on in the hero. */
  animate?: boolean;
}

export function AnimatedLogo({
  className,
  animate = false,
}: AnimatedLogoProps) {
  const reduceMotion = useReducedMotion();
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (!animate || reduceMotion) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    // Deferred so the state change lands in the next commit, not this effect.
    const id = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(id);
  }, [animate, reduceMotion]);

  const strokeProps = {
    fill: "none",
    stroke: "var(--text-primary, #f7f8f8)",
    strokeWidth: 15,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };

  return (
    <svg
      viewBox="0 0 240 56"
      className={className}
      role="img"
      aria-label="YusufCreates"
    >
      <title>YusufCreates</title>

      <g transform="translate(-16.3, -4.3) scale(0.304)">
        {/* Rotation happens about the mark's own centre so the arms swing
            rather than orbit. */}
        <motion.path
          d={CHEVRON}
          {...strokeProps}
          style={{ originX: "110px", originY: "92px" }}
          initial={play ? { rotate: -140, opacity: 0 } : false}
          animate={play ? { rotate: 0, opacity: 1 } : undefined}
          transition={{ duration: 0.9, ease: EASE }}
        />
        <motion.path
          d={ARM}
          {...strokeProps}
          style={{ originX: "110px", originY: "92px" }}
          initial={play ? { rotate: 140, opacity: 0 } : false}
          animate={play ? { rotate: 0, opacity: 1 } : undefined}
          transition={{ duration: 0.9, delay: 0.06, ease: EASE }}
        />
        <motion.rect
          x={99}
          y={155}
          width={34}
          height={17}
          fill="var(--accent, #5e6ad2)"
          initial={play ? { opacity: 0 } : false}
          animate={play ? { opacity: [0, 1, 0, 1] } : undefined}
          transition={{ duration: 0.7, delay: 0.8, times: [0, 0.35, 0.7, 1] }}
        />
      </g>

      <motion.text
        x={52}
        y={38}
        fontSize={28}
        letterSpacing="-0.022em"
        style={{ fontFamily: FONT_STACK }}
        initial={play ? { opacity: 0, x: 4 } : false}
        animate={play ? { opacity: 1, x: 0 } : undefined}
        transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
      >
        <tspan fontWeight={400} fill="var(--text-primary, #f7f8f8)">
          Yusuf
        </tspan>
        <tspan fontWeight={600} fill="var(--accent, #5e6ad2)">
          Creates
        </tspan>
      </motion.text>
    </svg>
  );
}
