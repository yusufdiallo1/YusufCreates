"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Reveal } from "@/components/motion/Reveal";
import { TextReveal } from "@/components/motion/TextReveal";
import { Typewriter } from "@/components/motion/Typewriter";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { WorkingHours } from "@/components/marketing/WorkingHours";
import { FieldError } from "@/components/ui/FieldError";
import { validateEmail, validateRequired } from "@/lib/validate";
import {
  EXPRESS_DEPOSIT_USD,
  EXPRESS_PRICE_USD,
  EXPRESS_WINDOW_HOURS,
} from "@/lib/pricing";

/**
 * Ordering an express build.
 *
 * One screen, four fields. Anything longer defeats the point — this is for
 * someone who wants a site today, and a four-step qualification flow is how
 * that person leaves.
 *
 * The terms are stated before the form rather than under it. A guarantee
 * someone reads after committing is a guarantee they did not buy.
 */

const TERMS = [
  {
    title: "The clock starts when I accept",
    body: `Not when you pay. An order placed at 3am is not already late by breakfast — you get an email the moment the ${EXPRESS_WINDOW_HOURS} hours actually begin, and a live countdown to watch.`,
  },
  {
    title: "Half now, half only if I am on time",
    body: `$${EXPRESS_DEPOSIT_USD} to start. If it is live inside the window, the remaining $${EXPRESS_PRICE_USD - EXPRESS_DEPOSIT_USD} is due. If I miss it, you keep that and still get the site.`,
  },
  {
    title: "Two pages, and I need your content",
    body: "Whatever you want on them — but the text and images have to come with the brief. I am not writing your copy inside two hours, and the clock does not start until I have everything.",
  },
];

export function ExpressOrder() {
  const router = useRouter();
  const create = useMutation(api.express.create);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [brief, setBrief] = useState("");
  const [pages, setPages] = useState(1);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const nameError = validateRequired(name, "your name");
  const emailError = validateEmail(email);
  const briefError = validateRequired(brief, "what you need");
  const valid = !nameError && !emailError && !briefError;

  return (
    <div className="mx-auto max-w-2xl px-6 pt-32 pb-24">
      <TextReveal as="h1" by="word" className="block text-4xl">
        Live in two hours
      </TextReveal>

      <Typewriter as="p" speed={22} className="mt-5 text-secondary">
        {`Up to two pages, built and deployed while you wait. $${EXPRESS_PRICE_USD} total — and if I miss the window, you owe nothing more and still get the site.`}
      </Typewriter>

      {/* Stated before the form. A guarantee read after committing is a
          guarantee nobody actually bought. */}
      <ul className="mt-10 divide-y divide-[color:var(--border-hairline)]">
        {TERMS.map((term, i) => (
          <li key={term.title}>
            <Reveal delay={i * 0.06}>
              <div className="py-5">
                <h2 className="text-base text-primary">{term.title}</h2>
                <p className="mt-1.5 text-sm text-secondary">{term.body}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal>
        <div className="hairline mt-10 rounded-xl bg-surface-1 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ex-name" className="text-sm text-secondary">
                Name
              </label>
              <input
                id="ex-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-base text-primary sm:text-sm"
              />
              {touched.name ? <FieldError>{nameError}</FieldError> : null}
            </div>

            <div>
              <label htmlFor="ex-email" className="text-sm text-secondary">
                Email
              </label>
              <input
                id="ex-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-base text-primary sm:text-sm"
              />
              {touched.email ? <FieldError>{emailError}</FieldError> : null}
            </div>
          </div>

          <div className="mt-4">
            <span className="text-sm text-secondary">Pages</span>
            <div
              role="radiogroup"
              aria-label="How many pages"
              className="mt-2 flex gap-2"
            >
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={pages === n}
                  onClick={() => setPages(n)}
                  className={`min-h-11 rounded-full border px-5 text-sm transition-colors duration-fast ${
                    pages === n
                      ? "border-[color:var(--accent)] bg-surface-2 text-primary"
                      : "border-[color:var(--border-hairline)] text-secondary hover:text-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="ex-brief" className="text-sm text-secondary">
              What do you need?
            </label>
            <textarea
              id="ex-brief"
              rows={6}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, brief: true }))}
              placeholder="What the site is for, what should be on it, and any text or links you already have."
              className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-base text-primary sm:text-sm"
            />
            {touched.brief ? <FieldError>{briefError}</FieldError> : null}
          </div>

          {/* Before money changes hands. An express build has a delivery
              clock attached, and it starts when I start — so the hours that
              clock runs on are stated before the deposit, not after. */}
          <WorkingHours className="mt-6" />

          <div className="mt-6">
            <SlideToConfirm
              purpose="to-payment"
              label={`Slide to pay $${EXPRESS_DEPOSIT_USD} and queue it`}
              ariaLabel="Slide to pay the deposit and queue your express build"
              disabled={!valid || !isConvexConfigured}
              onConfirm={async () => {
                setError(null);
                try {
                  const { token } = await create({
                    name,
                    email,
                    brief,
                    pages,
                  });
                  /*
                   * Straight to their portal.
                   *
                   * Payment is taken there rather than here: the row exists
                   * first, so an abandoned checkout is a visible order I can
                   * follow up rather than nothing at all.
                   */
                  router.push(`/express/${token}`);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "That did not go through. Try again.",
                  );
                  throw err;
                }
              }}
            />
            <FieldError>{error}</FieldError>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
