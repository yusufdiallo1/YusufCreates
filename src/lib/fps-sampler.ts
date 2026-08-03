/**
 * Live FPS sampling, and the one-way tier degradation it drives.
 *
 * The naive version of this — count frames, demote under 45 — demotes every
 * device on every load and oscillates thereafter. Four corrections make it
 * usable, and each exists because of a specific way the simple version lies:
 *
 * 1. WARM-UP. The first seconds of a page load are hydration, font swap and
 *    image decode. Frame rate is always poor there and it says nothing about
 *    the device. Nothing is judged until the warm-up has passed.
 *
 * 2. WINDOW LEAD-IN. Even after warm-up, the first moments of any window catch
 *    the tail of whatever triggered it. The opening slice of each window is
 *    measured but not counted.
 *
 * 3. OUTLIER REJECTION. A frame delta over half a second is a tab switch, a
 *    long task or a breakpoint — not a rendering problem. One such frame drags
 *    a window's average below any threshold, so a window containing one is
 *    discarded entirely rather than averaged.
 *
 * 4. DEFERRED COMMIT. Acting on a verdict mid-scroll is the worst possible
 *    moment: dropping canScrub tears down a ScrollTrigger and dropping can3D
 *    disposes a WebGL context, both of which cost more than the jank being
 *    fixed. The verdict is recorded immediately and applied at scroll idle.
 */

import { degradeTier, getCapabilitySnapshot } from "./capability";

/** Nothing is judged before this. Covers hydration, fonts and first images. */
const WARM_UP_MS = 3_000;

/** Sustained rate below this for a whole window is a demotion verdict. */
const FPS_FLOOR = 45;

/** How long the rate must stay down. Shorter than this catches transients. */
const WINDOW_MS = 2_000;

/** Opening slice of each window, measured but not counted. See note 2. */
const WINDOW_LEAD_IN_MS = 500;

/** A frame slower than this is not a rendering problem. See note 3. */
const OUTLIER_FRAME_MS = 500;

/** Quiet period after the last scroll before a verdict may be applied. */
const SCROLL_IDLE_MS = 200;

export interface SamplerHandle {
  stop: () => void;
  /** Live rate for the debug overlay. NaN until the first window closes. */
  getFps: () => number;
}

/**
 * Start sampling. Returns a handle; call stop() on unmount.
 *
 * Sampling ends permanently once `minimal` is reached — there is nothing left
 * to demote and the RAF loop is itself a cost worth reclaiming.
 */
export function startFpsSampler(): SamplerHandle {
  let rafId = 0;
  let stopped = false;

  let windowStart = 0;
  let countedFrames = 0;
  let countedSince = 0;
  let sawOutlier = false;
  let lastFrame = 0;
  let liveFps = Number.NaN;

  /** Verdict recorded but not yet applied — see note 4. */
  let pendingDemotion = false;
  let lastScrollAt = 0;

  const onScroll = () => {
    lastScrollAt = performance.now();
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  const applyIfIdle = (now: number) => {
    if (!pendingDemotion) return;
    if (now - lastScrollAt < SCROLL_IDLE_MS) return;
    pendingDemotion = false;
    degradeTier();
    // Nothing below minimal, so the loop has no further purpose.
    if (getCapabilitySnapshot().tier === "minimal") stop();
  };

  const resetWindow = (now: number) => {
    windowStart = now;
    countedSince = now + WINDOW_LEAD_IN_MS;
    countedFrames = 0;
    sawOutlier = false;
  };

  const tick = (now: number) => {
    if (stopped) return;
    rafId = requestAnimationFrame(tick);

    const delta = lastFrame === 0 ? 0 : now - lastFrame;
    lastFrame = now;

    applyIfIdle(now);

    // A background tab stops firing rAF entirely, so the first frame back
    // carries the whole absence as its delta. Outlier rejection covers that,
    // but skipping while hidden avoids pointless work in the first place.
    if (document.visibilityState !== "visible") {
      resetWindow(now);
      return;
    }

    if (now < WARM_UP_MS) {
      resetWindow(now);
      return;
    }

    if (windowStart === 0) {
      resetWindow(now);
      return;
    }

    if (delta > OUTLIER_FRAME_MS) sawOutlier = true;
    if (now >= countedSince) countedFrames += 1;

    if (now - windowStart < WINDOW_MS) return;

    const countedMs = now - countedSince;
    if (!sawOutlier && countedMs > 0) {
      const fps = (countedFrames * 1000) / countedMs;
      liveFps = fps;
      if (fps < FPS_FLOOR) {
        // Recorded now, applied when the main thread is quiet.
        pendingDemotion = true;
        applyIfIdle(now);
      }
    }

    resetWindow(now);
  };

  rafId = requestAnimationFrame(tick);

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("scroll", onScroll);
  }

  return { stop, getFps: () => liveFps };
}
