"use client";

import { useEffect, useState } from "react";
import { getWorkingHours, HOURS_SUMMARY, type WorkingHours as Hours } from "@/lib/hours";

/**
 * States when I am actually reachable, in my timezone rather than theirs.
 *
 * Deliberately quiet: a hairline rule and secondary text, not a warning
 * banner. Nothing has gone wrong — someone is sending a message at a
 * reasonable hour of their own day, and the only thing worth adding is when
 * it will be read. A yellow alert box would make a normal fact feel like a
 * problem.
 *
 * `now` is resolved in an effect rather than at render because the server
 * and the browser evaluate at different instants: rendering the clock
 * directly means the HTML says one thing, hydration says another, and React
 * logs a mismatch. Until it resolves the standing policy is shown, which is
 * true at every hour and needs no clock at all.
 */
export function WorkingHours({
  variant = "inline",
  className = "",
}: {
  /** `inline` states the live status; `summary` states the policy only. */
  variant?: "inline" | "summary";
  className?: string;
}) {
  const [hours, setHours] = useState<Hours | null>(null);

  useEffect(() => {
    setHours(getWorkingHours());

    /*
     * Re-checks on the minute. Someone can sit on the form long enough to
     * cross 21:00, and a notice that still says "I'm at my desk" twenty
     * minutes after I left is worse than one that never claimed it.
     */
    const id = setInterval(() => setHours(getWorkingHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (variant === "summary") {
    return (
      <p className={`text-sm text-secondary ${className}`}>{HOURS_SUMMARY}</p>
    );
  }

  return (
    <div className={`hairline-t pt-4 ${className}`}>
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
            hours?.open ? "bg-accent" : "bg-[color:var(--text-notice)]"
          }`}
        />
        <p className="text-sm text-secondary">
          {/*
            The live status leads, the standing policy follows it. Before the
            clock resolves there is no status to lead with, so the policy
            stands alone rather than being printed twice.
          */}
          {hours ? (
            <>
              {hours.message}{" "}
              <span className="text-primary">{HOURS_SUMMARY}</span>
            </>
          ) : (
            <span className="text-primary">{HOURS_SUMMARY}</span>
          )}
        </p>
      </div>
    </div>
  );
}
