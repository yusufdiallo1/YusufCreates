"use client";

import { useState } from "react";
import Link from "next/link";
import { TextReveal } from "@/components/motion/TextReveal";
import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Marquee } from "@/components/motion/Marquee";
import { FieldError } from "@/components/ui/FieldError";
import { validateEmail } from "@/lib/validate";
import { useEntryState } from "@/components/providers/EntryStateProvider";

/**
 * ContactCTA — the closing band on every marketing page.
 *
 * Alongside the primary CTA there is a single email field for people who are
 * not ready for the full brief. It writes a cold lead with source "cta-band".
 *
 * SlideToConfirm is deliberately NOT used here: the gesture is reserved for
 * irreversible actions, and leaving an email address is neither costly nor
 * hard to undo. Using it on a low-commitment action would make it meaningless
 * where it matters.
 */

type Status = "idle" | "sending" | "sent" | "error";

/**
 * What the closing marquee says.
 *
 * The kinds of work, not the tools — the tech ticker at the top of the
 * homepage already lists those, and repeating them here would make the page
 * end where it began. These are the things someone might actually be looking
 * for when they arrive at the bottom still deciding.
 */
const CLOSING_WORDS = [
  "Websites",
  "Web apps",
  "iOS and macOS",
  "Rescues",
  "Aftercare",
  "Ecommerce",
  "Landing pages",
  "Design systems",
  "Integrations",
];

export function ContactCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Errors appear only after a submit attempt or after leaving the field —
  // scolding someone mid-typing is the thing that makes forms feel hostile.
  const [touched, setTouched] = useState(false);

  /*
   * The closing band adapts to who is reading it.
   *
   *   lead       They have already enquired. "Start a project" is the wrong
   *              ask entirely — the only outstanding question they have is
   *              what is happening with the one they started.
   *   returning  They have been here before and not acted. Leading with the
   *              full brief has already failed at least once, so the low-
   *              commitment option leads instead: an email address is a much
   *              smaller thing to hand over than a four-step form, and it is
   *              still a way in.
   *
   * PROPERTY FLIPS ONLY. The two actions swap visual WEIGHT — which one wears
   * the solid fill — and never swap places in the DOM. See THE SSR RULE in
   * lib/entryState.ts.
   */
  const entryState = useEntryState();
  const isLead = entryState === "lead";
  const emailLeads = entryState === "returning";

  /* The filled button and the outlined one, decided once. */
  const solid =
    "block rounded-full bg-primary px-5 py-3 text-center text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90";
  const outline =
    "control-outline block w-full rounded-full px-4 py-2.5 text-center text-sm text-primary transition-colors duration-hover ease-hover hover:bg-surface-2 disabled:opacity-60";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;

    const problem = validateEmail(email);
    if (problem) {
      setTouched(true);
      setFieldError(problem);
      return;
    }
    setFieldError(null);

    setStatus("sending");
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "cta-band" }),
      });
      if (!response.ok) throw new Error("Request failed");
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    /*
      NO AMBIENT LIGHT. This section used to be wrapped in AmbientLight, a
      900px accent-coloured radial that drifted toward the pointer. However
      carefully it was tuned, what it read as was a purple blob following the
      cursor, and it was asked to go more than once. There is no light source
      on this page now; depth comes from the surface ladder and the hairlines,
      which is what it comes from everywhere else on the site.
    */
    /* py-32, matching Testimonials — the page ends wide and quiet.
       This band also closes /pricing, /services and /enterprise, so the
       spacing is deliberately the same everywhere: the close should feel like
       the same room whichever page you arrived at it from. */
    <section id="contact" className="relative overflow-hidden px-6 py-32">
      {/*
        TWO COLUMNS, NOT A CENTRED STACK.

        The content was centred in a wide panel, which left a large empty box
        with a headline floating in it — the screenshot of that reads as a
        section that has not been designed rather than as the close of the
        page. Splitting it puts the argument on the left and the action on the
        right, so the eye lands on a heading and travels to a button instead of
        hunting around a symmetrical void.

        The actions also sit in their OWN bordered surface. Making the thing
        you want people to do look like a distinct object, rather than more
        content in the same box, is most of the difference here.
      */}
      <div className="glass-depth glass-near glass-panel relative mx-auto max-w-4xl overflow-hidden px-6 py-12 sm:px-10">
        {/* A hairline of accent along the top edge — the one place this
            section spends colour on something other than the button. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--accent)]/50 to-transparent"
        />

        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-12">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-hairline)] px-3 py-1.5 text-xs text-secondary">
                <span
                  aria-hidden="true"
                  className="size-1.5 animate-pulse rounded-full bg-accent"
                />
                Available for new work
              </span>
            </Reveal>

            <TextReveal as="h2" by="word" className="mt-5 block text-4xl">
              Let&apos;s build the thing.
            </TextReveal>

            <WordReveal className="mt-4 max-w-sm text-secondary">
              Tell me what you need. I reply to everything within a day.
            </WordReveal>
          </div>

          <Reveal delay={0.12}>
            <div className="hairline rounded-[var(--radius-lg)] bg-surface-1 p-5">
              {/* Label, href and weight all flip; the element does not. A
                  returning visitor sees this demoted to an outline so the
                  email field below reads as the main way in. */}
              <Magnetic>
                <Link
                  href={isLead ? "/portal" : "/pricing"}
                  className={emailLeads && !isLead ? outline : solid}
                >
                  {isLead ? "Check your project status" : "Start a project"}
                </Link>
              </Magnetic>

              {/*
                THE WAY OUT THAT IS NOT LEAVING.

                Every other exit from this band commits to something: start a
                project, or hand over an email address. Someone who has read
                the whole page and is still not ready had nowhere to go but
                the back button, and a closing section whose only options are
                "buy" and "give me your contact details" is where a warm
                visitor becomes a bounce.

                "View all work" costs nothing, asks nothing, and keeps them on
                the site — and /work is the page most likely to answer
                whatever is actually still in doubt.

                Quiet by design. It is an alternative, not a competitor to the
                two real actions either side of it.
              */}
              <Link
                href="/work"
                className="mt-3 block rounded-full px-5 py-2.5 text-center text-sm text-secondary transition-colors duration-hover ease-hover hover:bg-surface-2 hover:text-primary"
              >
                View all work
              </Link>

              {/* The separator earns its place: it marks the two paths as
                  alternatives rather than a sequence. */}
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-[color:var(--separator)]" />
                <span className="text-[11px] text-muted">or</span>
                <span className="h-px flex-1 bg-[color:var(--separator)]" />
              </div>

              {/* noValidate: the browser's own bubble is unstyleable, renders in OS
              chrome that ignores the theme entirely, and disappears on the next
              keystroke. Validation is ours, so the message can match the page
              and persist for screen readers. */}
              <form noValidate onSubmit={onSubmit}>
                <div className="flex flex-col gap-2">
                  <label htmlFor="cta-email" className="sr-only">
                    Your email address
                  </label>
                  <input
                    id="cta-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    aria-invalid={touched && fieldError ? true : undefined}
                    aria-describedby={
                      fieldError ? "cta-email-error" : undefined
                    }
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Clear as soon as it becomes valid, so the message goes away
                      // the moment it stops being true.
                      if (touched) setFieldError(validateEmail(e.target.value));
                    }}
                    onBlur={() => {
                      if (email.trim() === "") return;
                      setTouched(true);
                      setFieldError(validateEmail(email));
                    }}
                    placeholder="you@company.com"
                    disabled={status === "sending" || status === "sent"}
                    className="hairline w-full min-w-0 rounded-full bg-surface-2 px-4 py-2.5 text-sm text-primary placeholder:text-secondary disabled:opacity-60"
                  />
                  {/* Takes the solid fill when the email capture is what
                      leads — a returning visitor who has already declined the
                      full brief at least once. */}
                  <button
                    type="submit"
                    disabled={status === "sending" || status === "sent"}
                    className={
                      emailLeads && !isLead
                        ? `${solid} w-full disabled:opacity-60`
                        : outline
                    }
                  >
                    {status === "sending" ? "Sending…" : "Send me a note"}
                  </button>
                </div>

                <div className="px-1">
                  <FieldError id="cta-email-error">
                    {touched ? fieldError : null}
                  </FieldError>
                </div>
              </form>

              <p
                role="status"
                aria-live="polite"
                className="mt-3 min-h-5 text-xs text-secondary"
              >
                {status === "sent"
                  ? "Got it — I'll be in touch."
                  : status === "error"
                    ? "That didn't send. Try hello@yusufcreates.com instead."
                    : ""}
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      {/*
        The closing marquee.

        The last thing on every marketing page is a form, and a form is a full
        stop. This is the line under it: the kinds of work, moving, so the page
        ends on something alive rather than on an empty input.

        Outside the panel and at the section's full width — inside it the row
        would have nowhere to travel and would read as a list that happens to
        be sliding. The items are quiet by design; the centre-focus falloff in
        Marquee is what gives the row a reading point.
      */}
      <div className="relative mt-16 -mb-6">
        <Marquee speed={90} gap={0} className="text-secondary">
          {CLOSING_WORDS.map((word) => (
            <span
              key={word}
              className="flex items-center whitespace-nowrap text-lg"
            >
              {word}
              <span aria-hidden="true" className="px-8 text-lg opacity-40">
                ·
              </span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
