/**
 * Working hours, in my timezone.
 *
 * The site takes enquiries around the clock from every timezone, and the
 * promise attached to them ("I read it within 24 hours") was being made
 * without reference to when I am actually at a desk. Someone sending at
 * 02:00 on a Friday was told the same thing as someone sending at 10:00 on a
 * Tuesday, and one of those two was going to be disappointed.
 *
 * So the hours are stated up front rather than discovered by waiting.
 */

/**
 * Asia/Riyadh is Medinah's zone: AST, UTC+3, and — unusually — no daylight
 * saving at all. Named rather than hardcoded as +3 anyway, because a fixed
 * offset is the kind of thing that is right until a government changes it,
 * and Intl already tracks that.
 */
export const TIMEZONE = "Asia/Riyadh";

/**
 * The zone as a visitor should read it.
 *
 * A timezone, not a city. "Medinah time" asks someone in London to know
 * where that is and work out the offset; "AST (UTC+3)" is the same fact in
 * the form every other site states it in, and converts on sight.
 *
 * Declared up here with the other constants because getWorkingHours below
 * interpolates it — a `const` is not hoisted, so defining it after the
 * function would only work by accident of call order.
 */
export const TIMEZONE_LABEL = "AST (UTC+3)";

/** Work stops at 21:00. Enquiries arriving after this wait for morning. */
export const CLOSES_AT_HOUR = 21;

/** And starts at 09:00. */
export const OPENS_AT_HOUR = 9;

/**
 * Friday is off — the Jumu'ah day of rest, not a weekend of convenience.
 *
 * Saturday is a normal working day here, which is worth being explicit about
 * because a visitor in London reading "closed weekends" would assume the
 * opposite and be wrong in both directions.
 */
export const CLOSED_WEEKDAY = 5;

export type WorkingHours = {
  /** True when it is currently a working hour where I am. */
  open: boolean;
  /** True when today is the day off, whatever the hour. */
  restDay: boolean;
  /** Local hour in my zone, 0-23. */
  hour: number;
  /** Day of week in my zone, 0 = Sunday. */
  weekday: number;
  /** One line, ready to print: why it is closed and when that changes. */
  message: string;
};

/*
 * Formatted rather than arithmetic on the UTC offset.
 *
 * Intl resolves the zone's actual rules, so this stays correct without a
 * table of offsets to maintain — and correct is the whole point, since a
 * badge that says "available now" at 3am is worse than no badge.
 */
const FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "numeric",
  hour12: false,
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Human label for the next working day after `weekday`. */
function nextWorkingDay(weekday: number): string {
  // Only Friday is skipped, so the next day is Saturday unless today is
  // Thursday — in which case Friday intervenes and it is Saturday too.
  const next = (weekday + 1) % 7;
  if (next === CLOSED_WEEKDAY) return "Saturday";
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][next];
}

/**
 * Where my local clock currently stands.
 *
 * Takes an optional `now` so this is testable and so the server and client
 * can be handed the same instant — a component that called `new Date()` in
 * both places would hydrate with two different answers on the boundary.
 */
export function getWorkingHours(now: Date = new Date()): WorkingHours {
  const parts = FORMATTER.formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const weekdayPart = parts.find((p) => p.type === "weekday")?.value ?? "Sun";

  /*
   * hour12:false yields "24" rather than "0" for midnight in some ICU
   * versions. Left as-is that reads as hour 24, which compares as after
   * closing on a day that has not started — technically the right answer for
   * the wrong reason, but it breaks the opens-at comparison.
   */
  const raw = Number(hourPart);
  const hour = raw === 24 ? 0 : raw;
  const weekday = WEEKDAY_INDEX[weekdayPart] ?? 0;

  const restDay = weekday === CLOSED_WEEKDAY;
  const withinHours = hour >= OPENS_AT_HOUR && hour < CLOSES_AT_HOUR;
  const open = !restDay && withinHours;

  let message: string;
  if (restDay) {
    message = "It's Friday my end — my day off. I'll pick this up Saturday morning.";
  } else if (hour >= CLOSES_AT_HOUR) {
    /*
     * Thursday night is the one evening where "in the morning" would be
     * wrong — Friday intervenes, so the honest answer is Saturday.
     */
    const when = weekday === 4 ? "on Saturday" : "in the morning";
    message = `It's past ${CLOSES_AT_HOUR}:00 ${TIMEZONE_LABEL}, so I've finished for the day. I'll read this ${when}.`;
  } else if (hour < OPENS_AT_HOUR) {
    message = `It's early my end — I start at ${OPENS_AT_HOUR}:00 ${TIMEZONE_LABEL}. I'll read this once I'm at my desk.`;
  } else {
    message = "I'm at my desk right now.";
  }

  return { open, restDay, hour, weekday, message };
}

/** The standing hours, for places that state the policy rather than the moment. */
export const HOURS_SUMMARY = `Saturday to Thursday, ${OPENS_AT_HOUR}:00–${CLOSES_AT_HOUR}:00 ${TIMEZONE_LABEL}. Closed Fridays.`;
