"use client";

import { useState } from "react";

/**
 * Call booking.
 *
 * An iframe rather than @calcom/embed-react: the package pulls in its own
 * React tree and event bus for what is ultimately a hosted page, and the
 * iframe degrades to a plain link when JavaScript or the embed fails. One
 * fewer dependency for the same result.
 *
 * Availability is shown in the VISITOR'S timezone — Cal.com detects it — and
 * the zone is named alongside so there is no ambiguity. A US client should see
 * their own clock, never mine.
 */

const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK;

export function BookingEmbed() {
  const [failed, setFailed] = useState(false);

  // Resolved once on the client; rendering it on the server would show the
  // server's zone and then mismatch on hydration.
  const [zone] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      return (
        new Intl.DateTimeFormat("en-US", { timeZoneName: "long" })
          .formatToParts(new Date())
          .find((p) => p.type === "timeZoneName")?.value ??
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );
    } catch {
      return null;
    }
  });

  if (!CAL_LINK) {
    return (
      <p className="text-sm text-secondary">
        Booking is not set up yet — email{" "}
        <a href="mailto:hello@yusufcreates.com" className="text-accent">
          hello@yusufcreates.com
        </a>{" "}
        and we&apos;ll find a time.
      </p>
    );
  }

  const url = `https://cal.com/${CAL_LINK}?theme=dark`;

  if (failed) {
    return (
      <a href={url} className="text-sm text-accent hover:text-primary">
        Open the booking page →
      </a>
    );
  }

  return (
    <div>
      {zone ? (
        <p className="mb-4 text-xs text-secondary">
          Times are shown in your timezone ({zone}).
        </p>
      ) : null}
      <iframe
        title="Book a call"
        src={url}
        onError={() => setFailed(true)}
        className="hairline h-[42rem] w-full rounded-xl bg-surface-1"
      />
      <p className="mt-3 text-xs text-secondary">
        Not loading?{" "}
        <a href={url} className="text-accent">
          Open it in a new tab
        </a>
        .
      </p>
    </div>
  );
}
