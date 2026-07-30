import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Referrals.
 *
 * Someone shares the site; whoever follows the link gets a code worth 10% off,
 * good for 14 days. The code is a real promo row, so it flows through the same
 * validation, redemption counting and concurrency guard as every other promo —
 * a second discount system would be a second place for the numbers to go wrong.
 *
 * Deliberately NOT rewarding the referrer. Paying for introductions changes
 * what a recommendation means, and a referral fee is a thing you would have to
 * disclose. The value here is that their friend gets a better price.
 */

/** Unambiguous characters only — these codes get read aloud and retyped. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 8;
const VALID_DAYS = 14;
const PERCENT_OFF = 10;

/** Referral codes never apply to Enterprise — that pricing is negotiated. */
const EXCLUDED_TIERS = ["enterprise"];

/**
 * Every tier a referral code is good for.
 *
 * Stated as an allow-list because `appliesTo: []` means "every tier" in the
 * schema — so the exclusion above was declared, exposed through `terms`, and
 * then not enforced. The share copy promised Enterprise was excluded while
 * the code applied to it.
 */
const ELIGIBLE_TIERS = [
  "launch",
  "growth",
  "app",
  "native",
  "care",
].filter((t) => !EXCLUDED_TIERS.includes(t));

function makeCode(): string {
  const bytes = new Uint8Array(CODE_LEN);
  crypto.getRandomValues(bytes);
  // Modulo bias across a 31-char alphabet is negligible at this scale and the
  // codes are single-use, rate-limited and short-lived.
  return `YC${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

/**
 * Issues a code to someone who arrived through a share link.
 *
 * Idempotent per VISITOR, not per share link.
 *
 * It used to key on the referral id alone — which comes from the sharer's
 * browser and is therefore the same for everyone who follows one link. Every
 * recipient resolved to the same promo row, and that row allows a single
 * redemption, so the first person to use it burned the code and everyone
 * after got a dead one.
 *
 * The visitor id is minted client-side and kept in their own storage, so a
 * reload still returns the same code while a different person gets their own.
 * Neither id is trusted for anything but idempotency — the discount is fixed
 * here, not passed in.
 */
export const claim = mutation({
  args: { ref: v.string(), visitor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ref = args.ref.trim().slice(0, 64);
    if (!ref) return { ok: false as const };

    const visitor = args.visitor?.trim().slice(0, 64);
    const name = visitor ? `Referral ${ref}:${visitor}` : `Referral ${ref}`;

    // Same visitor, same code — reloading the page must not mint a new one.
    // Indexed rather than scanned: this runs on a page load, and the table it
    // reads grows by a row per referral.
    const already = await ctx.db
      .query("promos")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (already?.code) {
      return {
        ok: true as const,
        code: already.code,
        percentOff: already.discountValue,
        expiresAt: already.endsAt ?? null,
      };
    }

    // Retried rather than assumed unique: 31^8 makes a clash vanishingly
    // unlikely, but "vanishingly unlikely" is not "impossible" and a duplicate
    // code would hand someone else's discount to the wrong person.
    let code = makeCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query("promos")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!clash) break;
      code = makeCode();
    }

    const now = Date.now();
    const endsAt = now + VALID_DAYS * 24 * 60 * 60 * 1000;

    await ctx.db.insert("promos", {
      name,
      kind: "code",
      code,
      discountType: "percentage",
      discountValue: PERCENT_OFF,
      // Named tiers, not an empty array — empty means "everything", which
      // included the one tier the offer says it excludes.
      appliesTo: ELIGIBLE_TIERS,
      startsAt: now,
      endsAt,
      // One project per referral. Without this the code spreads beyond the
      // person it was issued to.
      maxRedemptions: 1,
      redemptionCount: 0,
      paused: false,
      showCountdown: false,
    });

    return { ok: true as const, code, percentOff: PERCENT_OFF, expiresAt: endsAt };
  },
});

/** Terms shown next to the share control, so the offer is stated up front. */
export const terms = query({
  args: {},
  handler: async () => ({
    percentOff: PERCENT_OFF,
    validDays: VALID_DAYS,
    excludedTiers: EXCLUDED_TIERS,
  }),
});
