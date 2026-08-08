"use client";

/**
 * Form drafts — the enquiry form stops losing what you typed.
 *
 * /start is four steps and asks for real detail: what the project is, who it
 * is for, what state the existing site is in. Someone gets to step three,
 * opens a tab to check their own URL, comes back to a reloaded page and finds
 * every answer gone. That is not a lost form field, it is a lost enquiry —
 * almost nobody types all of that a second time.
 *
 * WHAT IS DELIBERATELY NOT PERSISTED:
 *
 *   companyWebsite  The honeypot. Restoring a value a bot filled in would
 *                   carry the spam signal into a session that might be human,
 *                   and a bot does not benefit from persistence anyway.
 *   openedAt        The time trap. Its whole job is to measure how long has
 *                   been spent ON THE FORM; restoring it from a draft written
 *                   yesterday would make every restored session look like it
 *                   took a day, which passes the check for free and makes the
 *                   layer meaningless.
 *
 * Nothing here is sent anywhere. It is one key in localStorage on the
 * visitor's own device, cleared the moment the enquiry lands.
 */

const KEY = "yc.draft.start";

/**
 * Seven days.
 *
 * Long enough to cover "I'll finish this at the weekend", short enough that a
 * half-written brief about a project someone has since abandoned does not
 * reappear months later — which reads as the site having kept something it
 * should not have, whether or not that is technically true.
 */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface FormDraft {
  values: Record<string, string>;
  plan: string;
  step: number;
  /** Epoch ms. Compared against TTL_MS on read. */
  savedAt: number;
}

/**
 * The stored draft, or null.
 *
 * Returns null rather than throwing for every failure mode — expired,
 * malformed, storage refused, written by an older version of this code. The
 * form treats all of them the same way, which is to start empty.
 */
export function readDraft(): FormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<FormDraft>;
    if (typeof parsed.savedAt !== "number") return null;

    if (Date.now() - parsed.savedAt > TTL_MS) {
      clearDraft();
      return null;
    }

    /*
     * Validated field by field, not cast.
     *
     * This is localStorage: an extension, another tab or a previous version of
     * this file can have written it. A `step` that arrives as a string would
     * put the form into a state its own bounds checks never anticipated.
     */
    const values: Record<string, string> = {};
    if (parsed.values && typeof parsed.values === "object") {
      for (const [key, value] of Object.entries(parsed.values)) {
        if (typeof value === "string") values[key] = value;
      }
    }

    return {
      values,
      plan: typeof parsed.plan === "string" ? parsed.plan : "",
      step: typeof parsed.step === "number" ? parsed.step : 1,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

/** Overwrites the draft. Called debounced; see StartForm. */
export function writeDraft(draft: Omit<FormDraft, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() } satisfies FormDraft),
    );
  } catch {
    // Private browsing, or the quota is full. Losing the draft is bad; taking
    // the form down with it would be worse.
  }
}

/**
 * Removes the draft.
 *
 * Called on a confirmed 2xx submit. Clearing it optimistically — before the
 * response — would destroy the answers in exactly the case where they are
 * needed most, which is the send having failed.
 */
export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do, and nothing worth surfacing.
  }
}
