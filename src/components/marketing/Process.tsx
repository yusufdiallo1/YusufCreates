"use client";

import { motion } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";

/**
 * Process — four sequential steps.
 *
 * Numbering earns its place because the order is real: you cannot build before
 * design, or launch before build.
 *
 * An earlier version pinned a title column while the detail scrolled past. It
 * left most of the viewport empty for most of the scroll, and the pinned label
 * drifted out of alignment with whichever step you were actually reading. A
 * plain four-column grid says the same thing in a quarter of the height and
 * needs no scroll hijacking, so it works identically on a phone and under
 * reduced motion.
 */

const STEPS = [
  {
    n: "01",
    title: "Discovery",
    body: "Thirty minutes, free. We talk about what the business needs to happen, not how many pages it has.",
  },
  {
    n: "02",
    title: "Design",
    body: "You review the real thing in your own browser, on your own phone. Static mockups hide how something actually feels.",
  },
  {
    n: "03",
    title: "Build",
    body: "Shipped in stages you can watch land, so nothing is a surprise at the end and changes stay cheap.",
  },
  {
    n: "04",
    title: "Launch",
    body: "Deployed, measured, and handed over with documentation written for you. You own everything.",
  },
];

export function Process() {
  return (
    <section
      aria-labelledby="process-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <Reveal>
        <h2 id="process-heading" className="text-3xl">
          How it works
        </h2>
        {/* One of four places on the site using this. It is an emphasis
            device — applied to body copy generally it stops meaning
            anything and turns reading into waiting. */}
        <WordReveal className="mt-3 max-w-xl text-secondary">
          Four steps, in order. No long discovery phase before anything is
          visible.
        </WordReveal>
      </Reveal>

      {/*
        THE FLOATING CONNECTOR IS GONE.

        It drew a cyan SVG path behind the grid, positioned from measured step
        boxes. Two things were wrong with it. It sat at its own vertical
        offset, so it crossed THROUGH the step rules rather than joining them —
        which read as a rendering fault rather than a design. And it was
        --dev-cyan, the one colour on a site whose accent is indigo, so the
        eye went straight to the part that was broken.

        The sequence is now drawn ON the rules themselves. Each step's own top
        hairline fills with the accent as it scrolls into view, left to right,
        staggered down the row. It cannot misalign — it IS the rule — and it
        costs one transform per step instead of a measured path and a
        ResizeObserver.
      */}
      <div className="relative">
        <ol className="relative mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.n}>
              <Reveal delay={index * 0.07}>
                {/*
                  The rule doubles as the step's visual anchor, and is where
                  the connector anchors too.

                  `group` + peer-less hover on the whole step rather than just
                  the heading: the target is the column, not the four words at
                  the top of it. The number is the element that changes most —
                  it goes from quiet meta to the accent, which is the only
                  colour this section spends.
                */}
                <div
                  data-process-step
                  className="group hairline-t relative pt-5 transition-colors duration-hover ease-hover hover:border-[color:var(--border-glass)]"
                >
                  {/* The rule fills with accent as the step arrives, then
                      brightens further on hover. scaleX from the left rather
                      than animating width: a transform is composited, a width
                      is a layout change on every frame. */}
                  <motion.span
                    aria-hidden="true"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: "some" }}
                    transition={{
                      duration: 0.7,
                      delay: 0.1 + index * 0.12,
                      ease: [0.33, 1, 0.68, 1],
                    }}
                    className="absolute -top-px left-0 h-px w-full origin-left bg-[color:var(--accent)] opacity-60 transition-opacity duration-hover ease-hover group-hover:opacity-100"
                  />
                  <p className="font-mono text-xs text-secondary tabular-nums transition-colors duration-hover ease-hover group-hover:text-accent">
                    {step.n}
                  </p>
                  <h3 className="mt-3 text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm text-secondary">{step.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
