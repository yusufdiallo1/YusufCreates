/**
 * The shared Lenis instance, and who is responsible for ticking it.
 *
 * A module singleton rather than React context, deliberately. ScrollTrigger
 * setup is imperative and needs the instance inside an effect, not during
 * render; and Lenis is constructed after first paint, so a context consumer
 * would see null on its first effect pass and have to re-run. A subscription
 * gives the value to whoever wants it, whenever it exists.
 *
 * ---------------------------------------------------------------------------
 * TICKER OWNERSHIP — the important part of this file.
 *
 * Lenis only moves the page when something calls lenis.raf() once per frame.
 * Exactly one thing may do that: calling it twice per frame with two different
 * timestamps makes one call see the whole frame delta and the other roughly
 * zero, which produces motion that is subtly wrong and very hard to diagnose.
 *
 * GSAP's ticker should own it where GSAP is present, so ScrollTrigger and
 * Lenis share a clock and scrubbed values do not stutter. But if nothing
 * claims it, Lenis would sit there having captured the wheel and doing
 * nothing with it — a completely unscrollable page.
 *
 * So ownership is explicit: a claimant calls claimTicker(), and SmoothScroll
 * checks hasTickerOwner() and drives its own loop if the answer is no. A flag,
 * not a timing guess.
 * ---------------------------------------------------------------------------
 */

import type Lenis from "lenis";

let instance: Lenis | null = null;

/**
 * Whether SmoothScroll has finished deciding.
 *
 * `null` is a MEANINGFUL FINAL VALUE here, not "not loaded yet" — Lenis is
 * never constructed on touch or under reduced motion. Without this flag a
 * consumer cannot tell "there will never be a Lenis" from "one is a tick
 * away", and would either wait forever or set itself up twice.
 */
let resolved = false;

let tickerOwner: symbol | null = null;

const listeners = new Set<(lenis: Lenis | null) => void>();

export function setLenis(next: Lenis | null): void {
  instance = next;
  for (const listener of listeners) listener(instance);
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Called by SmoothScroll on every path, including its early returns. */
export function markLenisResolved(): void {
  resolved = true;
  for (const listener of listeners) listener(instance);
}

export function isLenisResolved(): boolean {
  return resolved;
}

/** Fires immediately with the current value, then on every change. */
export function onLenisChange(
  callback: (lenis: Lenis | null) => void,
): () => void {
  listeners.add(callback);
  callback(instance);
  return () => listeners.delete(callback);
}

/**
 * Claim responsibility for calling lenis.raf() each frame.
 *
 * Returns false if someone already has it. The token must be passed back to
 * releaseTicker so a late unmount cannot revoke a claim it does not hold.
 */
export function claimTicker(token: symbol): boolean {
  if (tickerOwner !== null) return false;
  tickerOwner = token;
  return true;
}

export function releaseTicker(token: symbol): void {
  if (tickerOwner === token) tickerOwner = null;
}

export function hasTickerOwner(): boolean {
  return tickerOwner !== null;
}
