"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Line glyphs that draw themselves in when they scroll into view.
 *
 * The same treatment as ServiceGlyph on /services — pathLength 0→1, one stroke
 * at a time — generalised so the rest of the site can use it. ServiceGlyph
 * stays separate because its four marks are large diagrams of a service; these
 * are small marks that sit beside a line of text.
 *
 * DRAWN, NOT SOURCED. Every path here is on the same 24 grid with the same
 * stroke weight, so a row of them reads as one set rather than as icons
 * borrowed from three libraries. It also means no icon package in the bundle
 * for what amounts to a few dozen bytes of path data.
 *
 * Under reduced motion the strokes render complete and static. The glyph still
 * says what it says; only the drawing is dropped.
 */

export type GlyphName =
  | "reply"
  | "update"
  | "own"
  | "revise"
  | "handover"
  | "nda"
  | "handover-box"
  | "speed"
  | "uptime"
  | "invoice"
  | "insurance"
  | "scope"
  | "stage"
  | "progress"
  | "reply-time"
  | "files"
  | "call";

/** Each glyph is a list of paths, drawn in order. */
const GLYPHS: Record<GlyphName, string[]> = {
  // A speech bubble with a return arrow — a message that comes back.
  reply: ["M3 6h18v11H9l-5 4v-4H3Z", "M12 11h5", "M14 9l-2 2 2 2"],
  // A calendar with one day marked — the weekly written update.
  update: ["M4 6h16v14H4Z", "M4 10h16", "M8 3v4M16 3v4", "M9 15h6"],
  // A key — you own it.
  own: ["M14 8a3 3 0 1 1 3 3", "M14 11 4 21", "M7 18l2 2", "M10 15l2 2"],
  // Two arrows circling — revisions.
  revise: ["M4 10a8 8 0 0 1 14-4", "M20 14a8 8 0 0 1-14 4", "M18 2v5h-5", "M6 22v-5h5"],
  // A box passing between two hands.
  handover: ["M8 10h8v7H8Z", "M4 14l3-2", "M20 14l-3-2", "M12 4v5", "M9 7l3-3 3 3"],
  // A shield — the NDA.
  nda: ["M12 3 20 6v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z", "M9 12l2 2 4-4"],
  // A page with a folded corner and a tick — documentation handed over.
  "handover-box": ["M6 3h8l5 5v13H6Z", "M14 3v5h5", "M9 15l2 2 4-4"],
  // A gauge — built fast, not optimised afterwards.
  speed: ["M4 18a9 9 0 1 1 16 0", "M12 18l4-6", "M12 18h.01"],
  // A pulse line — still running.
  uptime: ["M3 12h4l2-5 3 10 2-6 2 3h5"],

  // An invoice: a page with ruled lines and a total.
  invoice: ["M6 3h12v18H6Z", "M9 8h6", "M9 12h6", "M9 16h3"],
  // An umbrella — cover.
  insurance: ["M3 12a9 9 0 0 1 18 0Z", "M12 12v7a2 2 0 0 0 4 0"],
  // A bracket around a defined area — the scope of the work.
  scope: ["M8 4H4v16h4", "M16 4h4v16h-4", "M10 12h4"],
  // Stacked layers landing one at a time — staged delivery.
  stage: ["M12 3 3 8l9 5 9-5Z", "M3 13l9 5 9-5", "M3 18l9 4 9-4"],

  // A ring closing — how far through the project you are.
  progress: ["M12 3a9 9 0 1 1-9 9", "M12 3a9 9 0 0 1 9 9", "M12 8v4l3 2"],
  // A stopwatch — typical reply time.
  "reply-time": ["M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M12 9v4l3 2", "M9 2h6"],
  // Stacked sheets — files delivered.
  files: ["M8 3h7l4 4v10H8Z", "M15 3v4h4", "M5 7v13h10"],
  // A handset — calls held.
  call: ["M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"],
};

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DrawnGlyph({
  name,
  className,
  /** Shifts the whole sequence, for staggering a row of them. */
  delay = 0,
}: {
  name: GlyphName;
  className?: string;
  delay?: number;
}) {
  const still = useReducedMotion() ?? false;
  const paths = GLYPHS[name];

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/*
        ALWAYS motion.path, never a plain one.

        Swapping to <path> under reduced motion changed the element and dropped
        the four attributes Motion writes to animate a stroke — pathLength,
        stroke-dasharray, stroke-dashoffset and opacity. useReducedMotion is
        null on the server and a boolean on the client, so the server emitted
        all four and a reduced-motion client emitted none. HowIWork alone draws
        several of these, and one mismatch fails hydration for the whole route.

        `still` collapses the duration instead: the stroke is complete in the
        first painted frame, which is what the header comment above promises.
        See Reveal.tsx for the rule this is an instance of.
      */}
      {paths.map((d, index) => (
        <motion.path
          key={index}
          d={d}
          {...STROKE}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          /* once: a glyph that redraws every time it re-enters the viewport
             turns scrolling back up into a light show. */
          viewport={{ once: true, margin: "0px", amount: "some" }}
          transition={
            still
              ? { duration: 0 }
              : {
                  duration: 0.7,
                  delay: delay + index * 0.12,
                  ease: [0.33, 1, 0.68, 1],
                }
          }
        />
      ))}
    </svg>
  );
}
