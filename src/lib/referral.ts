/**
 * Referral identity, shared between the share control, the welcome panel and
 * the inquiry form.
 *
 * Two different ids, and the distinction is the whole point:
 *
 *   shareId   identifies the PERSON SHARING. Stable per browser, so one
 *             person's link stays one link.
 *   visitorId identifies the PERSON ARRIVING. Also stable per browser, but
 *             theirs — which is what stops everyone who follows a single
 *             share link from resolving to the same single-use code.
 *
 * Neither is a secret and neither grants anything. They exist so a reload
 * does not mint a second code.
 */

const SHARE_KEY = "yc.shareid";
const VISITOR_KEY = "yc.visitorid";

/** Where the claimed code is kept so the inquiry form can pre-fill it. */
export const REFERRAL_CODE_KEY = "yc.refcode";

/** Unambiguous characters only — these end up in URLs people paste. */
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function makeId(): string {
  // crypto.getRandomValues over Math.random: this is an idempotency key, and
  // a collision hands one person another person's code.
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function stableId(key: string): string {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = makeId();
    localStorage.setItem(key, created);
    return created;
  } catch {
    // Private mode or storage disabled. A fresh id each call means a reload
    // mints a new code, which is worse than the alternative but still bounded
    // by the promo's own redemption limit.
    return makeId();
  }
}

/** The sharer's id. Goes into the links they hand out. */
export function shareId(): string {
  return stableId(SHARE_KEY);
}

/** The arriving visitor's id. Keys their code so it is theirs alone. */
export function visitorId(): string {
  return stableId(VISITOR_KEY);
}

/** The code claimed on this device, if there is one. */
export function storedReferralCode(): string {
  try {
    return localStorage.getItem(REFERRAL_CODE_KEY) ?? "";
  } catch {
    return "";
  }
}
