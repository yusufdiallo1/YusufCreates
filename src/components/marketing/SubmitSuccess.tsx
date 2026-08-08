"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { WorkingHours } from "@/components/marketing/WorkingHours";
import { track } from "@/lib/track";

/**
 * Post-submission state. Deliberately a full panel rather than a toast: the
 * person has just handed over their details and deserves confirmation that
 * stays on screen, plus a clear account of what happens next.
 *
 * The checkmark draws itself with pathLength, using the same two 45 degree
 * segments as the SlideToConfirm tick so the geometry stays consistent.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const NEXT_STEPS = [
  {
    n: "01",
    // The window is substituted at render from settings, so the promise
    // shown here is the one currently being made.
    title: "I read it within {reply}",
    body: "Counted in working hours, so a Thursday night message gets read Saturday. Every enquiry gets a real reply from me, not an autoresponder.",
  },
  {
    n: "02",
    title: "A short video and a few questions",
    body: "I record a couple of minutes on what I think the shape of the work is, and ask whatever I need to quote properly.",
  },
  {
    n: "03",
    title: "We talk",
    body: "Thirty minutes, no obligation. If I am not the right person, I will say so and point you somewhere better.",
  },
];

/**
 * Which kind of work each plan is, in the words an admin actually types into a
 * project's category field.
 *
 * Matched loosely on purpose. `category` is free text set per project — it is
 * "Web app", "Marketing site", "Rebuild" and whatever else has seemed right at
 * the time — so an exact lookup would silently match nothing the first time
 * someone wrote "SaaS platform" instead of "Web app". Substrings, first hit
 * wins, and a miss falls through to simply showing the newest piece of work,
 * which is never a bad answer.
 */
const PLAN_CATEGORY_HINTS: Record<string, string[]> = {
  "one-page": ["landing", "one-page", "one page", "site"],
  "multi-page": ["site", "marketing", "web"],
  "web-app": ["app", "saas", "platform", "dashboard", "portal"],
  native: ["ios", "macos", "native", "mobile", "app"],
  enterprise: ["platform", "enterprise", "app"],
  revive: ["rebuild", "rescue", "redesign", "site"],
  support: ["site", "care", "web"],
};

export function SubmitSuccess({
  summary,
  plan,
}: {
  summary: { label: string; value: string }[];
  /** Plan id from src/lib/inquiry.ts. Picks the case study shown below. */
  plan?: string;
}) {
  const reduceMotion = useReducedMotion();
  const copy = useQuery(
    api.settings.publicCopy,
    isConvexConfigured ? {} : "skip",
  );
  const replyWindow = copy?.replyWindow ?? "24 hours";

  /*
   * Something to read while they wait.
   *
   * This screen used to end on a mailto for urgent things, which is a dead end
   * dressed as an option: the enquiry has just been sent, so there is nothing
   * urgent yet, and the only remaining action was to leave. A case study of
   * roughly the kind of work they just asked about is the one genuinely useful
   * next thing — it answers "what will this actually be like" while the reply
   * is still being written.
   *
   * A small limit and the pick done in JS. The alternative is a query that
   * takes a category, which would need an index on a free-text field to be
   * worth anything and would still miss on the first unexpected spelling.
   */
  const projects = useQuery(
    api.projects.listPublished,
    isConvexConfigured ? { limit: 24 } : "skip",
  );

  const hints = plan ? (PLAN_CATEGORY_HINTS[plan] ?? []) : [];
  const suggestion =
    projects?.find((p) => {
      const category = p.category?.toLowerCase() ?? "";
      return hints.some((hint) => category.includes(hint));
    }) ??
    // No category matched — the newest published project still beats nothing.
    projects?.[0];

  return (
    <div>
      <svg
        width={56}
        height={56}
        viewBox="0 0 56 56"
        role="img"
        aria-label="Sent"
        className="mx-auto"
      >
        <circle
          cx={28}
          cy={28}
          r={26}
          fill="none"
          stroke="var(--border-hairline)"
          strokeWidth={2}
        />
        {/* Two exact 45 degree segments, square caps, mitred joins. */}
        <motion.path
          d="M17 29 L25 37 L40 22"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinecap="square"
          strokeLinejoin="miter"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 0.5,
            delay: reduceMotion ? 0 : 0.15,
            ease: EASE,
          }}
        />
      </svg>

      <h1 className="mt-8 text-center text-3xl">
        Thanks — that&apos;s with me.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-center text-secondary">
        A confirmation is on its way to your inbox.
      </p>

      {/* The reply window below is counted in working hours, so it is worth
          saying which hours those are — otherwise "within 24 hours" reads as
          a clock that runs through Friday, and it does not. */}
      <WorkingHours className="mx-auto mt-8 max-w-md" />

      <ol className="mt-12 space-y-6">
        {NEXT_STEPS.map((step, index) => (
          <motion.li
            key={step.n}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: reduceMotion ? 0 : 0.4 + index * 0.1,
              ease: EASE,
            }}
            className="hairline-t flex gap-5 pt-5"
          >
            <span className="text-xs text-secondary tabular-nums">
              {step.n}
            </span>
            <div>
              <h2 className="text-base text-primary">{step.title.replace("{reply}", replyWindow)}</h2>
              <p className="mt-1 text-sm text-secondary">{step.body}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      {summary.length > 0 ? (
        <div className="hairline-t mt-12 pt-6">
          <h2 className="text-xs text-secondary uppercase">What you sent</h2>
          <dl className="mt-4 space-y-2">
            {summary.map((item) => (
              <div key={item.label} className="flex gap-4 text-sm">
                <dt className="w-32 shrink-0 text-secondary">{item.label}</dt>
                <dd className="text-primary">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {/*
        THE PROMISE, RESTATED.

        It is already made inside step 01 above, but by the time someone has
        read three steps and a summary of their own answers it is four hundred
        pixels up the page. The single question this screen has to leave them
        holding is "when will I hear back", and the answer should be the last
        plain thing they read, not something they have to scroll to re-find.
      */}
      <p className="hairline-t mt-12 pt-6 text-center text-primary">
        I&apos;ll reply within {replyWindow}.
      </p>

      {/*
        WHILE YOU WAIT — the single obvious next action.

        Rendered only when there is a real project to point at. A heading
        promising something to read, above nothing, is worse than no heading.
      */}
      {suggestion ? (
        <div className="mt-10">
          <h2 className="text-xs text-secondary uppercase">While you wait</h2>
          <Link
            href={`/work/${suggestion.slug}`}
            data-cursor="view"
            onClick={() => track("cta_click", { cta: "success-case-study" })}
            className="hairline group mt-3 flex items-baseline justify-between gap-4 rounded-[var(--radius-lg)] bg-surface-1 p-5 transition-colors duration-hover ease-hover hover:bg-surface-2"
          >
            <span>
              <span className="block text-base text-primary">
                {suggestion.title}
              </span>
              <span className="mt-1 block text-sm text-secondary">
                {suggestion.summary}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-sm text-secondary transition-transform duration-hover ease-hover group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </div>
      ) : null}

      {/*
        The mailto, demoted to a footnote.

        It used to be the last and most prominent thing on the screen, which
        made "email me instead" the closing suggestion of a page whose entire
        purpose was that they had just successfully emailed me. It stays
        because occasionally something genuinely is urgent — but quietly, below
        the thing actually worth doing.
      */}
      <p className="mt-8 text-center text-xs text-secondary">
        Something urgent in the meantime?{" "}
        <a
          href="mailto:hello@yusufcreates.com"
          className="underline decoration-[color:var(--border-hairline)] underline-offset-4 transition-colors duration-hover ease-hover hover:text-primary"
        >
          hello@yusufcreates.com
        </a>
      </p>
    </div>
  );
}
