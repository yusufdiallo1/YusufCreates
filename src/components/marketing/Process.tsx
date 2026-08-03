"use client";

import { Reveal } from "@/components/motion/Reveal";
import { ProcessConnector } from "@/components/motion/ProcessConnector";
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

      {/* The grid stays a grid — see the note at the top of this file for why
          the pinned version was removed. The connector is drawn behind it and
          adds no layout of its own. */}
      <div className="relative">
        <ProcessConnector />

        <ol className="relative mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.n}>
              <Reveal delay={index * 0.07}>
                {/* The rule doubles as the step's visual anchor, and is where
                    the connector anchors too. */}
                <div data-process-step className="hairline-t pt-5">
                  <p className="text-xs text-secondary tabular-nums">{step.n}</p>
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
