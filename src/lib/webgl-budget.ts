/**
 * A hard cap on live WebGL contexts.
 *
 * Browsers allow roughly sixteen and then silently kill the OLDEST — so
 * exceeding the limit does not fail loudly at the point of the mistake; some
 * earlier canvas elsewhere goes black with no error connecting it to the cause.
 *
 * Four rather than sixteen, deliberately. This site needs one at a time, so a
 * budget of four leaves headroom for a mount that overlaps an unmount while
 * staying far clear of the cliff. If this ever refuses a claim, that is a bug
 * in the mounting logic, not a limit to raise.
 */

export const MAX_LIVE_CONTEXTS = 4;

let live = 0;

/** Returns false if the budget is spent; the caller must render a fallback. */
export function acquireContext(): boolean {
  if (live >= MAX_LIVE_CONTEXTS) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[webgl-budget] refused: ${live} contexts already live. Something is ` +
          `mounting scenes without disposing them — see components/three/disposal.ts.`,
      );
    }
    return false;
  }
  live += 1;
  return true;
}

export function releaseContext(): void {
  live = Math.max(0, live - 1);
}

/** For the debug overlay. */
export function liveContextCount(): number {
  return live;
}
