"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";

/**
 * Homepage FAQ — the objections that otherwise arrive by email before anyone
 * fills in the form. Deliberately different questions from the pricing page,
 * which covers terms rather than fit.
 */

const FAQ = [
  {
    q: "Do you work with individuals, not just companies?",
    a: "Yes, and often. Someone with an idea and no company behind them is usually clearer about what they want than a committee is. The process is the same either way.",
  },
  {
    q: "I already have a site. Can you just fix it?",
    a: "Usually. I audit what exists first and tell you honestly whether it is worth keeping. Sometimes the answer is that a rebuild costs less than fighting the current one.",
  },
  {
    q: "How involved do I need to be?",
    a: "A conversation at the start, then a review at each stage. Most clients spend a couple of hours total. You will never be chased for content you did not know you owed.",
  },
  {
    q: "What if I do not know what I need yet?",
    a: "That is what the first call is for, and it is free. Half of those conversations end with me pointing at something cheaper or off the shelf, which is a fine outcome.",
  },
  {
    q: "Which languages can you actually build in?",
    a: "English and Arabic natively, and French, Russian, Swedish or anything else with a translator involved. The work is making the site handle any language correctly, not speaking all of them.",
  },
];

export function Faq() {
  return (
    <section
      aria-labelledby="home-faq-heading"
      className="mx-auto max-w-3xl px-6 py-24"
    >
      <TextReveal as="h2" by="word" className="block text-3xl">
        Questions people ask first
      </TextReveal>

      <Accordion.Root type="single" collapsible className="mt-10">
        {FAQ.map((item, index) => (
          <Reveal key={item.q} delay={index * 0.04}>
            <Accordion.Item
              value={item.q}
              className="border-b border-[color:var(--border-hairline)]"
            >
              <Accordion.Header>
                <Accordion.Trigger className="faq-trigger flex w-full items-center justify-between gap-4 py-5 text-left">
                  <span className="text-base text-primary">{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="faq-chevron shrink-0 text-secondary"
                  >
                    +
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="faq-content overflow-hidden">
                <p className="pb-5 text-sm text-secondary">{item.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          </Reveal>
        ))}
      </Accordion.Root>
    </section>
  );
}
