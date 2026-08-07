"use client";

import { WordReveal } from "@/components/motion/WordReveal";
import { Reveal } from "@/components/motion/Reveal";

/**
 * A single line, brightened word by word as you reach it.
 *
 * Deliberately not a famous quotation. A stranger's aphorism on a portfolio
 * says nothing about the person who built it; a sentence I would actually say
 * to a client does. It sits between sections as a breath rather than as
 * another block of content to read.
 *
 * It was typed out character by character until now. That made a reader wait
 * on a machine to finish saying something they could already have read, every
 * single time the section came into view. Scroll-linked brightening keeps the
 * line feeling spoken while never withholding it — see WordReveal, where the
 * dim state is 0.28 rather than 0 for exactly that reason.
 */

export function TypedQuote({
  children,
  attribution,
}: {
  children: string;
  attribution?: string;
}) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <WordReveal
          as="blockquote"
          className="text-2xl leading-snug text-primary text-balance"
        >
          {children}
        </WordReveal>

        {attribution ? (
          // Fades in on its own timing rather than brightening: two of the same
          // device stacked cancel each other out.
          <Reveal delay={0.4}>
            <p className="mt-5 text-xs tracking-normal text-secondary uppercase">
              {attribution}
            </p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
