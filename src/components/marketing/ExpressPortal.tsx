"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "motion/react";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * The express build portal — what someone sees after paying their deposit.
 *
 * The countdown is the product, so it is honest about all four states rather
 * than only the happy one: waiting to start, running, delivered on time, and
 * delivered late. The last of those is the one most sites would hide, and it
 * is the whole reason the promise means anything.
 *
 * dueAt comes from the server. A deadline computed in the browser is a
 * deadline a wrong clock can argue with, and this decides who keeps money.
 */

function useCountdown(dueAt: number | null) {
  // Rendered from state rather than read during render, because Date.now()
  // in a render body makes the output depend on when React happens to run.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!dueAt) return;
    /*
     * The first tick is scheduled, not written synchronously.
     *
     * A setState in an effect body cascades an extra render before paint —
     * and the countdown is late by less than one frame either way, which is
     * invisible on a clock that ticks in seconds.
     */
    const id = setInterval(() => setNow(Date.now()), 1000);
    const first = setTimeout(() => setNow(Date.now()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [dueAt]);

  if (!dueAt || now === null) return null;

  const remaining = dueAt - now;
  const late = remaining <= 0;
  const abs = Math.abs(remaining);

  return {
    late,
    hours: Math.floor(abs / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
    /** 0-1 through the window, for the ring. */
    progress: Math.min(1, Math.max(0, 1 - remaining / (2 * 60 * 60 * 1000))),
  };
}

export function ExpressPortal({ token }: { token: string }) {
  const reduceMotion = useReducedMotion();
  const build = useQuery(
    api.express.byToken,
    isConvexConfigured ? { token } : "skip",
  );
  const clock = useCountdown(build?.dueAt ?? null);

  if (build === undefined) {
    return <p className="py-24 text-center text-sm text-secondary">Loading…</p>;
  }

  if (build === null) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl text-primary">Nothing here</h1>
        <p className="mt-3 text-sm text-secondary">
          That link is not one of mine. Check it came from the confirmation
          email.
        </p>
      </div>
    );
  }

  const money = (minor: number) =>
    (minor / 100).toLocaleString("en-US", {
      style: "currency",
      currency: build.currency.toUpperCase(),
    });

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <p className="text-xs tracking-normal text-secondary uppercase">
        Express build
      </p>
      <h1 className="mt-2 text-3xl">{build.name}</h1>

      {/* ---------------------------------------------------------------- */}
      {build.status === "awaiting_payment" ? (
        <div className="hairline mt-10 rounded-xl bg-surface-1 p-6">
          <p className="text-primary">Waiting on the deposit</p>
          <p className="mt-2 text-sm text-secondary">
            Nothing starts until {money(build.depositAmount)} is paid. The
            clock does not run in the meantime.
          </p>
        </div>
      ) : null}

      {build.status === "queued" ? (
        <div className="hairline mt-10 rounded-xl bg-surface-1 p-6">
          <p className="text-primary">Paid. Waiting for me to start.</p>
          <p className="mt-2 text-sm text-secondary">
            The two hours begin the moment I accept, not now — so an order
            placed overnight is not already late by morning. You will get an
            email the second the clock starts.
          </p>
        </div>
      ) : null}

      {/* The clock itself. */}
      {clock && build.status === "building" ? (
        <div className="mt-10 flex flex-col items-center">
          <svg width={200} height={200} viewBox="0 0 200 200" role="img"
               aria-label={
                 clock.late
                   ? "Past the two-hour window"
                   : `${clock.hours} hours ${clock.minutes} minutes remaining`
               }>
            <circle cx={100} cy={100} r={88} fill="none"
                    stroke="var(--bg-surface-2)" strokeWidth={8} />
            <motion.circle
              cx={100} cy={100} r={88} fill="none"
              stroke={clock.late ? "var(--danger)" : "var(--accent)"}
              strokeWidth={8} strokeLinecap="round"
              transform="rotate(-90 100 100)"
              strokeDasharray={2 * Math.PI * 88}
              animate={{
                strokeDashoffset: 2 * Math.PI * 88 * (1 - clock.progress),
              }}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: "linear" }}
            />
          </svg>

          <p className="mt-6 text-4xl tabular-nums text-primary">
            {clock.late ? "−" : ""}
            {pad(clock.hours)}:{pad(clock.minutes)}:{pad(clock.seconds)}
          </p>

          <p className="mt-2 text-sm text-secondary">
            {clock.late
              ? "Past the window. The balance is yours to keep."
              : "Remaining. I am building it now."}
          </p>
        </div>
      ) : null}

      {build.status === "delivered" ? (
        <div className="mt-10">
          <div
            className={`hairline rounded-xl p-6 ${
              build.balanceWaived ? "bg-surface-1" : "bg-surface-1"
            }`}
          >
            <p className="text-primary">
              {build.balanceWaived ? "Delivered late." : "Delivered."}
            </p>
            <p className="mt-2 text-sm text-secondary">
              {build.balanceWaived
                ? `I missed the two hours, so the remaining ${money(build.balanceAmount)} is written off. You owe nothing further.`
                : `Inside the window. The remaining ${money(build.balanceAmount)} is now due.`}
            </p>

            {build.deliveredUrl ? (
              <a
                href={build.deliveredUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
              >
                Open your site
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* What they asked for, so the scope is on the record for both of us. */}
      <div className="hairline-t mt-12 pt-8">
        <h2 className="text-xs tracking-normal text-secondary uppercase">
          What you asked for
        </h2>
        <p className="mt-3 text-sm whitespace-pre-wrap text-secondary">
          {build.brief}
        </p>
        <p className="mt-4 text-xs text-secondary">
          {build.pages} {build.pages === 1 ? "page" : "pages"} ·{" "}
          {money(build.depositAmount)} paid ·{" "}
          {build.balanceWaived
            ? "balance waived"
            : `${money(build.balanceAmount)} on delivery`}
        </p>
      </div>
    </div>
  );
}
