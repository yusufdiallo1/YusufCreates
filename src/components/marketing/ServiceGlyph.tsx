"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * A drawn mark for each service.
 *
 * Not decoration and not an icon set: each one is a small diagram of the
 * thing it names, so the shape carries some of the meaning the paragraph
 * underneath would otherwise have to. That is the point — the services page
 * was four blocks of prose, and prose is the slowest way to say "this is a
 * site" versus "this is software people log into".
 *
 * Drawn rather than sourced. These are four specific ideas, and no icon set
 * has a mark for "right-to-left mirroring" that means anything.
 */

type Kind = "site" | "app" | "bilingual" | "rescue";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Draws itself in on reveal, then stays. */
function Draw({
  d,
  delay = 0,
  still,
}: {
  d: string;
  delay?: number;
  still: boolean;
}) {
  if (still) return <path d={d} {...STROKE} />;
  return (
    <motion.path
      d={d}
      {...STROKE}
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}

export function ServiceGlyph({
  kind,
  className,
}: {
  kind: Kind;
  className?: string;
}) {
  const still = useReducedMotion() ?? false;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* A page with its content blocks — the thing being judged. */}
      {kind === "site" ? (
        <>
          <Draw still={still} d="M10 14 H54 V50 H10 Z" />
          <Draw still={still} d="M10 22 H54" delay={0.15} />
          <Draw still={still} d="M17 30 H37" delay={0.3} />
          <Draw still={still} d="M17 38 H47" delay={0.4} />
          <Draw still={still} d="M17 44 H29" delay={0.5} />
        </>
      ) : null}

      {/* A window with a locked door: software you get into, not just read. */}
      {kind === "app" ? (
        <>
          <Draw still={still} d="M10 14 H54 V50 H10 Z" />
          <Draw still={still} d="M10 24 H54" delay={0.15} />
          <Draw still={still} d="M26 34 H38 V46 H26 Z" delay={0.3} />
          <Draw still={still} d="M29 34 V30 A3 3 0 0 1 35 30 V34" delay={0.45} />
        </>
      ) : null}

      {/* Two mirrored text blocks about an axis — the whole idea of RTL. */}
      {kind === "bilingual" ? (
        <>
          <Draw still={still} d="M32 10 V54" />
          <Draw still={still} d="M8 24 H26" delay={0.15} />
          <Draw still={still} d="M14 32 H26" delay={0.25} />
          <Draw still={still} d="M8 40 H26" delay={0.35} />
          <Draw still={still} d="M56 24 H38" delay={0.2} />
          <Draw still={still} d="M50 32 H38" delay={0.3} />
          <Draw still={still} d="M56 40 H38" delay={0.4} />
        </>
      ) : null}

      {/* A broken line rejoined — taking something over and making it whole. */}
      {kind === "rescue" ? (
        <>
          <Draw still={still} d="M8 40 L20 28 L28 36" />
          <Draw still={still} d="M36 28 L44 36 L56 24" delay={0.3} />
          <Draw still={still} d="M30 44 L34 20" delay={0.55} />
        </>
      ) : null}
    </svg>
  );
}
