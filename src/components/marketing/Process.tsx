"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Process — four sequential steps.
 *
 * Numbering earns its place here because the order is real: you cannot build
 * before design, or launch before build.
 *
 * Desktop pins the step title on the left while the detail scrolls past on the
 * right, with the active step driven by scrollYProgress. Mobile drops the
 * sticky behaviour entirely and stacks plain cards — scroll-jacking on a phone
 * fights the one gesture the user actually has. Reduced motion gets the
 * stacked version at every width for the same reason.
 */

const STEPS = [
  {
    n: "01",
    title: "Discovery",
    body: "Thirty minutes, free, and we talk about what the business needs to happen — not how many pages it has. Most of the value is in ruling things out early.",
  },
  {
    n: "02",
    title: "Design",
    body: "You review the real thing in your own browser, on your own phone. Static mockups hide how something actually feels, and that is usually where the disagreements are.",
  },
  {
    n: "03",
    title: "Build",
    body: "Shipped in stages you can look at as they land, so nothing arrives as a surprise at the end and course corrections stay cheap.",
  },
  {
    n: "04",
    title: "Launch",
    body: "Deployed, measured, and handed over with documentation written for you rather than for another developer. You own everything.",
  },
];

export function Process() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });

  // Maps scroll position to the active step index.
  const activeIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, STEPS.length - 1],
  );

  return (
    <section
      aria-labelledby="process-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <Reveal>
        <h2 id="process-heading" className="text-3xl">
          How it works
        </h2>
      </Reveal>

      {/* Mobile and reduced-motion: plain stacked cards, no sticky. */}
      <ul
        className={
          reduceMotion ? "mt-12 space-y-4" : "mt-12 space-y-4 lg:hidden"
        }
      >
        {STEPS.map((step, index) => (
          <li key={step.n}>
            <Reveal delay={index * 0.06}>
              <div className="surface-1 p-6">
                <p className="text-xs text-secondary">{step.n}</p>
                <h3 className="mt-2 text-xl">{step.title}</h3>
                <p className="mt-2 text-sm text-secondary">{step.body}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>

      {/* Desktop: sticky title column, scrolling detail column. */}
      {!reduceMotion ? (
        <div ref={ref} className="mt-12 hidden gap-16 lg:grid lg:grid-cols-2">
          <div className="h-fit lg:sticky lg:top-32">
            <StickyTitle activeIndex={activeIndex} />
          </div>

          <ol className="space-y-32">
            {STEPS.map((step) => (
              <li key={step.n} className="min-h-[40svh]">
                <p className="text-xs text-secondary">{step.n}</p>
                <h3 className="mt-2 text-2xl">{step.title}</h3>
                <p className="mt-3 text-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

/** The pinned label. Cross-fades as the scroll position crosses each step. */
function StickyTitle({
  activeIndex,
}: {
  activeIndex: MotionValue<number>;
}) {
  return (
    <div className="relative h-32">
      {STEPS.map((step, index) => (
        // Each step owns its own component so useTransform is called at the
        // top level rather than inside a loop.
        <StickyTitleItem
          key={step.n}
          step={step}
          index={index}
          activeIndex={activeIndex}
        />
      ))}
    </div>
  );
}

function StickyTitleItem({
  step,
  index,
  activeIndex,
}: {
  step: (typeof STEPS)[number];
  index: number;
  activeIndex: MotionValue<number>;
}) {
  // Full opacity at this step, fading out within half a step either side.
  const opacity = useTransform(
    activeIndex,
    [index - 0.5, index, index + 0.5],
    [0, 1, 0],
  );

  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0"
      aria-hidden="true"
    >
      <p className="text-xs text-secondary">{step.n}</p>
      <p className="mt-2 text-4xl">{step.title}</p>
    </motion.div>
  );
}
