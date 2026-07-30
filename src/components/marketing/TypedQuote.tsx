"use client";

import { Typewriter } from "@/components/motion/Typewriter";
import { Reveal } from "@/components/motion/Reveal";

/**
 * A single line, typed out when you reach it.
 *
 * Deliberately not a famous quotation. A stranger's aphorism on a portfolio
 * says nothing about the person who built it; a sentence I would actually say
 * to a client does. It sits between sections as a breath rather than as
 * another block of content to read.
 */

export function TypedQuote({
  children,
  attribution,
  speed,
}: {
  children: string;
  attribution?: string;
  speed?: number;
}) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Typewriter
          as="blockquote"
          speed={speed}
          className="text-2xl leading-snug text-primary text-balance"
        >
          {children}
        </Typewriter>

        {attribution ? (
          // Fades in on its own timing rather than being typed: two typed
          // lines in a row reads as a gimmick.
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
