"use client";

import { motion, useReducedMotion } from "motion/react";
import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { WorkingHours } from "@/components/marketing/WorkingHours";

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

export function SubmitSuccess({
  summary,
}: {
  summary: { label: string; value: string }[];
}) {
  const reduceMotion = useReducedMotion();
  const copy = useQuery(
    api.settings.publicCopy,
    isConvexConfigured ? {} : "skip",
  );
  const replyWindow = copy?.replyWindow ?? "24 hours";

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

      <p className="mt-10 text-center text-sm text-secondary">
        Something urgent?{" "}
        <a
          href="mailto:hello@yusufcreates.com"
          className="text-accent transition-colors duration-hover ease-hover hover:text-primary"
        >
          hello@yusufcreates.com
        </a>
      </p>
    </div>
  );
}
