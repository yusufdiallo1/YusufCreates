"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Quiet — the page goes still while this section holds the viewport.
 *
 * There is one moment on this site where motion is actively hostile: the
 * moment someone is looking at a price and doing arithmetic. Everything else
 * here is built to draw the eye, and all of it becomes something to ignore
 * while a decision is being made. So the page stops.
 *
 * Wrap the section, and while its centre is in the middle of the viewport:
 *   - marquees freeze mid-cycle and resume from the same offset
 *   - the ambient temperature wash dims
 *   - anything CSS-animated behind [data-quiet] pauses
 *
 * AN INTERSECTIONOBSERVER, NOT A SCROLL LISTENER. The question is "is this
 * element in the middle of the screen", which is exactly what the observer
 * answers, off the main thread, for free. A scroll handler would recompute the
 * same boolean sixty times a second on the thread the animations are running
 * on — which is to say it would cost frames in order to save them.
 *
 * A MODULE STORE, NOT A CONTEXT. The things that have to go quiet are not
 * descendants of the section: the closing marquee lives inside ContactCTA, two
 * beats further down the page, and AmbientTemperature is mounted up in the
 * layout above everything. A provider could not reach either. This is the same
 * shape as src/lib/capability.ts for the same reason, and the same two rules
 * apply — a referentially stable snapshot, and a server snapshot that is a
 * constant rather than a call result.
 *
 * SSR: `false` on the server and on the client's first paint. Nothing is
 * quiet until an observer has fired, which is after hydration, so no consumer
 * can render a different tree than the server sent.
 */

/* --------------------------------------------------------------- the store */

let quiet = false;
const listeners = new Set<() => void>();

function setQuiet(next: boolean): void {
  if (quiet === next) return;
  quiet = next;

  /*
   * Published to the document element as well as to subscribers.
   *
   * Two consumers with different needs: React components read the store, and
   * CSS reads the attribute. Doing it here rather than in an effect keeps the
   * two from ever disagreeing — and follows the precedent in
   * CapabilityProvider, which publishes its tier the same way for the same
   * reason (the CSS owns properties the JS must not fight over).
   */
  if (typeof document !== "undefined") {
    document.documentElement.dataset.quiet = next ? "1" : "0";
  }

  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

const getSnapshot = () => quiet;
/* A module constant, not a call result — React compares with Object.is during
   hydration and a fresh value each time would mismatch. */
const getServerSnapshot = () => false;

/**
 * Whether the page is currently meant to be still.
 *
 * Read this in anything that moves on its own. Do not use it to decide whether
 * to RENDER something — only whether to animate it. Removing an element when
 * the page goes quiet would make scrolling past the pricing band reflow the
 * page under the reader.
 */
export function useQuiet(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ----------------------------------------------------------- the component */

export function Quiet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    /*
     * A band across the middle of the viewport.
     *
     * -35% top and bottom means the section counts as holding the page only
     * once it occupies the middle third — not when its first pixel appears at
     * the bottom edge. Going quiet as a section arrives would stop the
     * marquees while they are still the thing being looked at.
     */
    const observer = new IntersectionObserver(
      ([entry]) => setQuiet(Boolean(entry?.isIntersecting)),
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 },
    );

    observer.observe(host);
    return () => {
      observer.disconnect();
      /*
       * Released on unmount, not left set.
       *
       * Navigating away while the pricing band held the centre would otherwise
       * leave the whole site frozen with no element left on the page capable
       * of unfreezing it.
       */
      setQuiet(false);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
