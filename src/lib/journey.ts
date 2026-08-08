"use client";

/**
 * The journey record — what this browser has already done here.
 *
 * One JSON blob in localStorage under `yc.journey`. It exists so the site can
 * stop re-selling someone who has already read it: how many visits, when the
 * last one was, where they stopped reading, and whether they ever became a
 * lead.
 *
 * Deliberately NOT analytics. src/lib/track.ts sends events to a server and
 * answers questions about the audience; this is read synchronously on the
 * client to decide what to render, and never leaves the device. The two are
 * separate because they have different lifetimes and different consumers, and
 * folding one into the other would mean a blocked beacon could change the page.
 *
 * IDENTIFIERS — there are three on this device and they are not
 * interchangeable:
 *
 *   yc.visitor    src/lib/track.ts. Analytics identity. Reused here.
 *   yc.visitorid  src/lib/referral.ts. Keys ISSUED PROMO CODES. Leave it
 *                 alone — unifying it with the above would orphan every code
 *                 already claimed on a device.
 *   yc.journey    this file. Behaviour, not identity.
 *
 * Every read is wrapped and returns the zero record on failure. Private
 * browsing throws on the first storage access, and a visitor whose browser
 * refuses storage must still get a working site — they simply always look
 * cold, which is the correct degradation.
 */

const KEY = "yc.journey";
/** Guards the visit bump so a reload is not a visit. */
const SESSION_FLAG = "yc.journey.counted";

export interface Journey {
  /** Sessions, not page loads. Bumped at most once per tab. */
  visits: number;
  /** Epoch ms of the START of the previous visit, not this one. */
  lastVisitAt: number;
  /** id of the last `<section>` that held the viewport. */
  lastSection: string;
  /** Set once an enquiry is confirmed. Presence is the whole signal. */
  leadAt?: number;
}

const ZERO: Journey = { visits: 0, lastVisitAt: 0, lastSection: "" };

/**
 * The record as stored, with every field validated.
 *
 * Parsed defensively rather than cast: this is localStorage, which any
 * extension or an older version of this code can have written, and a `visits`
 * that arrives as a string would silently make `visits >= 2` false forever.
 */
export function readJourney(): Journey {
  if (typeof window === "undefined") return ZERO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return ZERO;
    const parsed = JSON.parse(raw) as Partial<Journey>;
    return {
      visits: typeof parsed.visits === "number" ? parsed.visits : 0,
      lastVisitAt:
        typeof parsed.lastVisitAt === "number" ? parsed.lastVisitAt : 0,
      lastSection:
        typeof parsed.lastSection === "string" ? parsed.lastSection : "",
      leadAt: typeof parsed.leadAt === "number" ? parsed.leadAt : undefined,
    };
  } catch {
    return ZERO;
  }
}

function write(next: Journey): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage refused. Nothing here is worth breaking a render over.
  }
}

/** Merges a patch into the stored record. */
export function patchJourney(patch: Partial<Journey>): Journey {
  const next = { ...readJourney(), ...patch };
  write(next);
  return next;
}

/**
 * This session's view of the record, computed once and then frozen.
 *
 * FROZEN IS THE POINT. Two things would otherwise make repeat reads disagree
 * with each other:
 *
 *   - the Tracker rewrites `lastSection` as the visitor scrolls, so a later
 *     read would return where they are NOW rather than where they stopped
 *     last time — and "pick up where you left off" would point at whatever
 *     they had just scrolled past.
 *   - the visit bump happens on the first read, so a caller that ran before
 *     it and one that ran after it would see different counts.
 *
 * Which matters because the callers genuinely do run in an unpredictable
 * order: Hero decides whether to play its load sequence in a LAYOUT effect,
 * and React runs those before the passive effect in EntryStateProvider that
 * would otherwise own this. Making the snapshot idempotent and order-
 * independent is what removes the race rather than papering over it.
 */
let sessionSnapshot: Journey | null = null;

/**
 * The record for this session, counting this visit.
 *
 * `visits` INCLUDES the current one, so a first-ever visitor sees 1 and
 * anything >= 2 means they have been here before. `lastVisitAt` and
 * `lastSection` describe the PREVIOUS visit — they are what "new since you
 * were last here" and "where you stopped reading" are measured against, so
 * this deliberately does not touch either.
 *
 * The sessionStorage flag is what makes a reload free. Without it, refreshing
 * three times to look at a layout would promote a cold visitor to `returning`
 * and skip the hero animation they had not actually seen yet.
 *
 * Safe to call from anywhere, as often as you like.
 */
export function visitSnapshot(): Journey {
  if (sessionSnapshot) return sessionSnapshot;

  const before = readJourney();
  if (typeof window === "undefined") return before;

  let counted = false;
  try {
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, "1");
      counted = true;
    }
  } catch {
    // Without a session flag every load would count. Counting nothing is the
    // safer failure: it under-reports rather than fabricating return visits.
  }

  const visits = counted ? before.visits + 1 : before.visits;
  if (counted) write({ ...before, visits });

  sessionSnapshot = { ...before, visits };
  return sessionSnapshot;
}

/**
 * Closes out this visit's timestamp.
 *
 * Called on pagehide rather than on load, so `lastVisitAt` means "when you
 * were last here" for the whole of the next visit instead of being overwritten
 * the moment it arrives.
 */
export function endVisit(): void {
  patchJourney({ lastVisitAt: Date.now() });
}

/** Where they stopped reading. Written throttled; see Tracker. */
export function setLastSection(id: string): void {
  if (!id) return;
  const current = readJourney();
  if (current.lastSection === id) return;
  write({ ...current, lastSection: id });
}

/**
 * Marks this browser as belonging to someone who has enquired.
 *
 * A timestamp and nothing else. No lead id, no token, no email — this is read
 * by client code to change a button's label, and none of those would make the
 * label any more correct while all of them would be worth stealing.
 */
export function markLead(): void {
  if (readJourney().leadAt) return;
  patchJourney({ leadAt: Date.now() });
}
