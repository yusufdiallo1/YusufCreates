"use client";

import { useState } from "react";
import { Reveal } from "@/components/motion/Reveal";

/**
 * How I work.
 *
 * Someone hiring a developer they have never met has two unspoken questions:
 * will this person disappear, and can I reach them. Vague reassurance reads
 * worse than none, so every line here is a specific commitment rather than a
 * feeling — a named response time, named ownership terms, a named handover.
 *
 * Availability renders in the VISITOR'S timezone. Telling a client in New York
 * that you are online 09:00–18:00 GST makes them do arithmetic to find out
 * whether you overlap at all.
 */

const ITEMS = [
  {
    title: "I reply within one business day",
    body: "Every message, including the ones that turn out not to be a fit. If I can't help, I'll say so quickly and point you somewhere better rather than going quiet.",
  },
  {
    title: "You get a written update every week",
    body: "What shipped, what's next, and anything that changed. You'll never have to ask how it's going — and you can email me directly at any point, not through a form.",
  },
  {
    title: "You own everything",
    body: "Code, designs, domains, accounts. All of it transfers to you on final payment, with no licence, no lock-in and no ongoing fee to keep using what you paid for.",
  },
  {
    title: "Unhappy with a milestone? We fix it or you stop",
    body: "Each milestone includes two rounds of revisions. If it still isn't right, you can end the project there and only pay for the milestones already delivered.",
  },
  {
    title: "If I'm unavailable, you're not stranded",
    body: "Repositories, accounts and documentation are in your name from day one. Another developer can pick it up without me — that's the point of building it properly.",
  },
  {
    title: "NDAs are fine",
    body: "Send yours and I'll sign it, or I'll provide a standard mutual one. Enterprise work regularly starts this way and it's never a problem.",
  },
];

/** My working hours in UTC, converted for display. */
const START_UTC = 6;
const END_UTC = 15;

export function HowIWork() {
  // Computed on the client only. Rendering a timezone-derived string on the
  // server would produce the server's zone and then mismatch on hydration.
  const [local] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fmt = (utcHour: number) => {
        const d = new Date();
        d.setUTCHours(utcHour, 0, 0, 0);
        return d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: zone,
        });
      };
      const label =
        new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          timeZoneName: "short",
        })
          .formatToParts(new Date())
          .find((p) => p.type === "timeZoneName")?.value ?? zone;
      return `${fmt(START_UTC)} – ${fmt(END_UTC)} ${label}`;
    } catch {
      return null;
    }
  });

  return (
    <section
      aria-labelledby="how-i-work-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <Reveal>
        <h2 id="how-i-work-heading" className="text-3xl">
          How I work
        </h2>
        <p className="mt-3 max-w-xl text-secondary">
          The things worth knowing before you hire someone you have not met.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-x-16 gap-y-10 sm:grid-cols-2">
        {ITEMS.map((item, index) => (
          <Reveal key={item.title} delay={Math.min(index * 0.05, 0.25)}>
            <h3 className="text-base text-primary">{item.title}</h3>
            <p className="mt-2 text-sm text-secondary">{item.body}</p>
          </Reveal>
        ))}
      </div>

      {local ? (
        <Reveal delay={0.3}>
          <p className="mt-14 text-sm text-secondary">
            I&apos;m usually online{" "}
            <span className="text-primary">{local}</span> — shown in your
            timezone, not mine.
          </p>
        </Reveal>
      ) : null}
    </section>
  );
}
