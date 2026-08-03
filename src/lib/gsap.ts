/**
 * The single place GSAP is registered.
 *
 * registerPlugin must run exactly once and never on the server. ES module
 * caching guarantees the once; the window guard handles the server. Import
 * gsap and ScrollTrigger from here rather than from the package, so there is
 * no path by which a component gets an unregistered ScrollTrigger.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/**
 * GSAP's documented lag-smoothing defaults.
 *
 * Restoring these on teardown matters: lagSmoothing(0) is correct only while
 * Lenis drives the ticker and GSAP needs true elapsed time. Leaving it at 0
 * afterwards means a blocking frame produces a large jump instead of being
 * smoothed, in native-scroll mode where nothing needs the raw timing.
 */
export const LAG_SMOOTHING_DEFAULT = [500, 33] as const;
