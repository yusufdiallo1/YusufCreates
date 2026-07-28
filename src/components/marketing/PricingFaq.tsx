"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Pricing FAQ. Answers the questions that otherwise arrive by email before
 * anyone fills in the form — timeline, payment, revisions, ownership.
 */

const FAQ = [
  {
    q: "How long does it take?",
    a: "Launch is usually one to two weeks. Growth is two to four depending on page count. Web apps start at six weeks. I give you a date before we start and tell you early if it moves.",
  },
  {
    q: "What are the payment terms?",
    a: "50% to start, 50% on launch. Enterprise is milestone-based and set out in the proposal. Card, Apple Pay, Google Pay or Link.",
  },
  {
    q: "How many revisions do I get?",
    a: "Two rounds of revisions per stage are included, and in practice I do not count them. Because you review the real thing in the browser rather than a mockup, disagreements surface early when they are cheap to fix.",
  },
  {
    q: "Who owns the code?",
    a: "You do. Code, domain, hosting accounts and any third-party services are all in your name. If you want to work with someone else afterwards, nothing is holding you.",
  },
  {
    q: "What about hosting?",
    a: "Deployed to Vercel on your own account, which is free at the traffic most sites see. Database and email are on their own free tiers until you outgrow them. The Care Plan covers this if you would rather not manage it.",
  },
  {
    q: "What happens after launch?",
    a: "Thirty days of support is included on every tier, for anything broken or unclear. After that you can take it over yourself with the documentation I hand over, or put the Care Plan in place.",
  },
];

export function PricingFaq() {
  return (
    <section
      aria-labelledby="faq-heading"
      className="mx-auto max-w-3xl px-6 py-24"
    >
      <Reveal>
        <h2 id="faq-heading" className="text-3xl">
          Questions
        </h2>
      </Reveal>

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
