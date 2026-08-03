/**
 * Capability tiers — how much motion this device can afford.
 *
 * Every animation component reads from here. The tier is not a preference, it
 * is a budget: three levels that trade fidelity for frames, resolved once from
 * device signals and then only ever revised downward.
 *
 * ---------------------------------------------------------------------------
 * THE SSR RULE — read this before adding a consumer.
 *
 * Tier is undetectable on the server. The server renders `reduced`, and so does
 * the client's first paint, which is what keeps hydration clean.
 *
 * That imposes a hard constraint on every consumer:
 *
 *   Structural DOM — sticky wrappers, height spacers, overlay layers — is
 *   decided by `tier !== "minimal"`, so it is always present in the SSR HTML.
 *   Only *effects* key off `tier === "full"`.
 *
 *   A component whose element tree differs between `reduced` and `full` is a
 *   bug. Upgrading must flip properties on an already-correct tree, never
 *   insert or remove nodes — inserting a 250vh wrapper one frame after
 *   hydration jumps the scroll position under the user's hands.
 *
 * `reduced` is the SSR tier rather than `full` or `minimal` deliberately:
 *   - `full` would ship blur and 3D markup to a low-end phone, then rip it out.
 *   - `minimal` omits structure, so upgrading would insert it and shift layout.
 *   - `reduced` keeps every wrapper while every expensive flag is off.
 * ---------------------------------------------------------------------------
 */

export type Tier = "full" | "reduced" | "minimal";

export interface Capability {
  tier: Tier;
  /** May this surface use backdrop-filter at all? */
  canBlur: boolean;
  /** May a WebGL scene mount? */
  can3D: boolean;
  /** May a scroll-scrubbed sequence bind? */
  canScrub: boolean;
  /** Pointer can hover — drives spotlight, magnetics, tilt. */
  canHover: boolean;
  /** Ceiling for blur radius, applied via CSS not inline style. */
  maxBlurPx: number;
  /** How many blurred elements may be on screen at once. */
  maxBlurredElements: number;
}

/**
 * The tier the server renders, and which the client's first paint must match.
 * See THE SSR RULE above.
 */
export const SSR_TIER: Tier = "reduced";

/* Budget constants — enforced in code, not by discipline. */
export const MAX_BLURRED_IN_VIEWPORT = 4;
export const MAX_SCRUBBED_SEQUENCES = 1;
export const MAX_3D_SCENES = 1;

/**
 * Ordered worst-last. Demotion walks forward through this and never back, so
 * the array order is the whole ratchet.
 */
const ORDER: readonly Tier[] = ["full", "reduced", "minimal"] as const;

export function demote(tier: Tier): Tier {
  const next = ORDER.indexOf(tier) + 1;
  return ORDER[Math.min(next, ORDER.length - 1)] ?? "minimal";
}

/** True if `a` is a strictly more capable tier than `b`. */
export function isBetter(a: Tier, b: Tier): boolean {
  return ORDER.indexOf(a) < ORDER.indexOf(b);
}

/* ---------------------------------------------------------------------------
   Deriving the flags

   maxBlurPx at `full` is 28, which is exactly --glass-near-blur in globals.css.
   That is not a coincidence and must stay true: it is how "LiquidGlass looks
   identical at full tier" is honoured. `reduced` at 12 matches the existing
   touch-device reduction that already ships.
   --------------------------------------------------------------------------- */

const BLUR_PX: Record<Tier, number> = { full: 28, reduced: 12, minimal: 0 };
const BLURRED_ELEMENTS: Record<Tier, number> = {
  full: MAX_BLURRED_IN_VIEWPORT,
  reduced: 2,
  minimal: 0,
};

export function capabilityFor(tier: Tier, canHover: boolean): Capability {
  return {
    tier,
    canBlur: tier !== "minimal",
    can3D: tier === "full",
    canScrub: tier === "full",
    canHover,
    maxBlurPx: BLUR_PX[tier],
    maxBlurredElements: BLURRED_ELEMENTS[tier],
  };
}

/* ---------------------------------------------------------------------------
   Static detection

   Synchronous and cheap — media queries and navigator fields, no timing. Safe
   to call from a mount effect, never from a render body or a getSnapshot (see
   the store section for why).
   --------------------------------------------------------------------------- */

function mq(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

/** Pointer can hover. Drives spotlight, magnetics and tilt. */
export function detectCanHover(): boolean {
  return !mq("(hover: none)");
}

/**
 * Resolve a tier from device signals alone.
 *
 * prefers-reduced-motion is a hard floor to `minimal` rather than a score
 * contribution: it is a stated user preference, not a performance hint, and
 * scoring it would let a fast desktop outvote the person using it.
 *
 * Everything else is scored, because no single weak signal should be decisive.
 * A phone is not slow because it is a phone.
 */
export function detectStaticTier(): Tier {
  if (typeof window === "undefined") return SSR_TIER;

  if (mq("(prefers-reduced-motion: reduce)")) return "minimal";

  let score = 0;

  // deviceMemory is capped at 8 and absent outside Chromium. Defaulting to 8
  // means Safari and Firefox never score here, which is right — those are
  // usually Macs, and guessing "low" from a missing field would be wrong.
  if ((navigator.deviceMemory ?? 8) < 4) score += 2;
  if ((navigator.hardwareConcurrency ?? 8) < 4) score += 2;

  const effective = navigator.connection?.effectiveType;
  if (effective === "2g" || effective === "slow-2g") score += 2;
  else if (effective === "3g") score += 1;

  // Data saver is a stated preference too, but a softer one than reduced
  // motion — it speaks to bytes rather than to vestibular comfort.
  if (navigator.connection?.saveData) score += 2;

  // Transparency is already forced off in CSS for this query; the score only
  // reflects that the user runs their OS conservatively.
  if (mq("(prefers-reduced-transparency: reduce)")) score += 1;
  if (mq("(hover: none)")) score += 1;

  if (score >= 4) return "minimal";
  if (score >= 2) return "reduced";
  return "full";
}

/* ---------------------------------------------------------------------------
   The store

   A module singleton read through useSyncExternalStore. Two requirements that
   are easy to get wrong and both fatal:
   --------------------------------------------------------------------------- */

/*
 * 1. getSnapshot must be REFERENTIALLY STABLE.
 *
 *    React compares snapshots with Object.is. Returning a fresh object literal
 *    on every call is an infinite render loop, so `current` is replaced only
 *    when a value genuinely changes.
 */
let current: Capability = capabilityFor(SSR_TIER, false);

/*
 * 2. The server snapshot is a frozen module constant, not a call result.
 *
 *    Same identity requirement — React calls getServerSnapshot during
 *    hydration, and a fresh object each time would mismatch.
 */
const SERVER_SNAPSHOT: Capability = Object.freeze(
  capabilityFor(SSR_TIER, false),
);

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeCapability(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getCapabilitySnapshot(): Capability {
  return current;
}

export function getServerCapabilitySnapshot(): Capability {
  return SERVER_SNAPSHOT;
}

/**
 * Commit a new tier. Ignores any attempt to improve on the current tier —
 * quality that oscillates is worse than quality that is merely stuck.
 */
export function commitTier(tier: Tier, canHover: boolean): void {
  if (current.tier === tier && current.canHover === canHover) return;
  // Never step back up. A device that stuttered once will stutter again, and
  // watching effects switch on and off is worse than not having them.
  const resolved = isBetter(tier, current.tier) && hasDegraded ? current.tier : tier;
  if (current.tier === resolved && current.canHover === canHover) return;
  current = capabilityFor(resolved, canHover);
  emit();
}

/* Set once the FPS sampler has demoted, which locks out any later upgrade. */
let hasDegraded = false;

/** Step the tier down one level, permanently for this session. */
export function degradeTier(): void {
  const next = demote(current.tier);
  if (next === current.tier) return;
  hasDegraded = true;
  current = capabilityFor(next, current.canHover);
  emit();
}

/** Test seam only — resets module state between suites. */
export function __resetCapability(): void {
  current = capabilityFor(SSR_TIER, false);
  hasDegraded = false;
  listeners.clear();
}
