"use client";

import { useSyncExternalStore } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { SpotlightGroup } from "@/components/motion/Spotlight";
import { DrawnGlyph, type GlyphName } from "@/components/ui/DrawnGlyph";

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

const ITEMS: { title: string; body: string; glyph: GlyphName }[] = [
  {
    glyph: "reply",
    title: "I reply within one business day",
    body: "Every message, including the ones that turn out not to be a fit. If I can't help, I'll say so quickly and point you somewhere better rather than going quiet.",
  },
  {
    glyph: "update",
    title: "You get a written update every week",
    body: "What shipped, what's next, and anything that changed. You'll never have to ask how it's going — and you can email me directly at any point, not through a form.",
  },
  {
    glyph: "own",
    title: "You own everything",
    body: "Code, designs, domains, accounts. All of it transfers to you on final payment, with no licence, no lock-in and no ongoing fee to keep using what you paid for.",
  },
  {
    glyph: "revise",
    title: "Unhappy with a milestone? We fix it or you stop",
    body: "Each milestone includes two rounds of revisions. If it still isn't right, you can end the project there and only pay for the milestones already delivered.",
  },
  {
    glyph: "handover",
    title: "If I'm unavailable, you're not stranded",
    body: "Repositories, accounts and documentation are in your name from day one. Another developer can pick it up without me — that's the point of building it properly.",
  },
  {
    glyph: "nda",
    title: "NDAs are fine",
    body: "Send yours and I'll sign it, or I'll provide a standard mutual one. Enterprise work regularly starts this way and it's never a problem.",
  },
];

/** My working hours in UTC, converted for display. */
const START_UTC = 6;
const END_UTC = 15;

/*
 * The visitor's local working hours, read as external state.
 *
 * This was a useState plus an effect that called setLocal on mount — correct
 * about hydration (the server cannot know the reader's timezone, so it must
 * render null first) but implemented as the exact cascade React's lint rule
 * warns about: render, effect, setState, render again.
 *
 * useSyncExternalStore is the primitive for precisely this shape — a value
 * that legitimately differs between server and client. React reads the server
 * snapshot while hydrating and the client one immediately after, and
 * reconciles the difference itself without a second render pass or a mismatch
 * warning.
 *
 * The snapshot is CACHED because getSnapshot must be referentially stable;
 * returning a freshly built string on every call is an infinite render loop.
 * Caching is also correct on the merits — a timezone does not change while
 * someone is reading a page.
 */
let cachedHours: string | null | undefined;

const subscribeLocalHours = () => () => {};
const localHoursServerSnapshot = (): string | null => null;

function localHoursSnapshot(): string | null {
  if (cachedHours !== undefined) return cachedHours;
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
    cachedHours = `${fmt(START_UTC)} – ${fmt(END_UTC)} ${label}`;
  } catch {
    // Leaves the line out entirely rather than showing a broken one.
    cachedHours = null;
  }
  return cachedHours;
}

export function HowIWork() {
  /*
   * Computed after hydration, not in a lazy initialiser.
   *
   * The initialiser runs during the first CLIENT render, so it produced the
   * timezone line on the client while the server had rendered null — the tree
   * differed and hydration failed, discarding and re-rendering the page. An
   * effect runs once hydration has committed, so both passes start identical
   * and the real local time appears a frame later.
   */
  const local = useSyncExternalStore(
    subscribeLocalHours,
    localHoursSnapshot,
    localHoursServerSnapshot,
  );

  return (
    <section
      aria-labelledby="how-i-work-heading"
      className="mx-auto max-w-5xl px-6 py-24"
    >
      <Reveal>
        {/*
          "What it's like to work with me", not "How I work".

          This sat directly beneath a section called "How it works" and the two
          headings were nearly indistinguishable — a reader scrolling past saw
          the same words twice and assumed the second was a repeat. "How it
          works" is the process; this is the relationship. Naming them
          differently is most of the fix.
        */}
        <h2 id="how-i-work-heading" className="text-3xl">
          What it&apos;s like to work with me
        </h2>
        <p className="mt-3 max-w-xl text-secondary">
          The things worth knowing before you hire someone you have not met.
        </p>
      </Reveal>

      {/*
        Cards rather than a bare two-column text grid.

        Every one of these is a commitment — a named response time, named
        ownership terms, a named exit. Set as loose paragraphs they read as
        reassurance, which is exactly the register the copy is trying to avoid.
        Giving each one an edge makes it read as a term.

        The check mark is drawn in CSS rather than shipped as an icon: one
        glyph, four instances, no import.
      */}
      <SpotlightGroup className="mt-14 grid gap-4 sm:grid-cols-2">
        {ITEMS.map((item, index) => (
          <Reveal key={item.title} delay={Math.min(index * 0.05, 0.25)}>
            <div
              data-spotlight=""
              className="group hairline relative h-full rounded-2xl bg-surface-1/50 p-5 transition-[transform,border-color] duration-hover ease-hover hover:-translate-y-0.5 hover:border-[color:var(--border-glass)]"
            >
              <div className="flex items-start gap-3">
                {/* One mark per commitment rather than six identical ticks.
                    A tick says "yes"; these say what the promise IS, and they
                    draw themselves in as the card arrives. */}
                <DrawnGlyph
                  name={item.glyph}
                  delay={Math.min(index * 0.05, 0.25)}
                  className="mt-0.5 size-5 shrink-0 text-accent"
                />
                <div className="min-w-0">
                  <h3 className="text-base text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm text-secondary">{item.body}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </SpotlightGroup>

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
