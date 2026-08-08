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
 * When full it links to the waitlist rather than going quiet: "booked until
 * March, hold a slot" converts better than silence, and it is true.
 */
export function AvailabilityBadge({ className }: { className?: string }) {
  const data = useQuery(api.capacity.slots, isConvexConfigured ? {} : "skip");

  // Until it resolves, say nothing rather than guessing. A badge that flips
  // from "available" to "full" a second after paint reads as broken.
  if (!data) return null;

  const open = data.openNow.build;
  const label =
    open > 0
      ? `${open} of ${data.buildSlots} slots open`
      : "Booked — join the waitlist";

  return (
    <Link
      href="/waitlist"
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full border border-[color:var(--border-hairline)] px-3 py-1.5 text-xs text-secondary transition-colors duration-hover ease-hover hover:text-primary"
      }
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          open > 0 ? "bg-accent" : "bg-[color:var(--text-notice)]"
        }`}
      />
      {label}
    </Link>
  );
}
