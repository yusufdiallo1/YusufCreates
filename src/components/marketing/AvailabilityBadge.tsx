"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Live availability.
 *
 * Reads the same derived capacity the waitlist does, so the badge and the
 * booking page can never disagree — the previous version said "available for
 * new work" unconditionally, which becomes a lie the moment both slots fill.
 *
 * IT IS A STATUS LINE FIRST AND A LINK SECOND.
 *
 * This used to be a Link unconditionally, which put a third call to action in
 * the hero's first viewport — above the headline, competing with "Start a
 * project" and "View work" before either had been read. "2 of 3 slots open" is
 * not an instruction; it is a fact that makes the two real CTAs below it more
 * urgent, and it does that better as plain text.
 *
 * When capacity runs out it becomes a link, because at that point joining the
 * waitlist IS the primary action and there is nothing left for it to compete
 * with. "Booked until March, hold a slot" converts better than silence, and it
 * is true.
 *
 * The live figure stays either way. Real scarcity is worth stating; the rule
 * this is honouring is against MANUFACTURED scarcity, and a number read off
 * the booking table is the opposite of that.
 */
export function AvailabilityBadge({ className }: { className?: string }) {
  const data = useQuery(api.capacity.slots, isConvexConfigured ? {} : "skip");

  // Until it resolves, say nothing rather than guessing. A badge that flips
  // from "available" to "full" a second after paint reads as broken.
  //
  // Also what keeps this hydration-safe: undefined on the server AND on the
  // client's first paint, so the span/link decision below is only ever made
  // once real data has arrived, in a commit the server never rendered.
  if (!data) return null;

  const open = data.openNow.build;
  const booked = open === 0;

  const content = (
    <>
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          booked ? "bg-[color:var(--text-notice)]" : "bg-accent"
        }`}
      />
      {booked
        ? "Booked — join the waitlist"
        : `${open} of ${data.buildSlots} slots open`}
    </>
  );

  const base =
    className ??
    "inline-flex items-center gap-2 rounded-full border border-[color:var(--border-hairline)] px-3 py-1.5 text-xs text-secondary";

  if (!booked) {
    /*
     * role="status" rather than a bare span: this is the one line on the page
     * whose content can change between visits without the visitor doing
     * anything, and a screen reader that has already read the hero should hear
     * it when it does.
     */
    return (
      <span role="status" className={base}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href="/waitlist"
      className={`${base} transition-colors duration-hover ease-hover hover:text-primary`}
    >
      {content}
    </Link>
  );
}
