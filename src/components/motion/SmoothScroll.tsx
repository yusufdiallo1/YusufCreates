"use client";

import { useEffect } from "react";
import { markLenisResolved } from "@/lib/lenis-instance";

/**
 * Native scrolling. Nothing is hijacked.
 *
 * This used to construct Lenis and hand the wheel to a JS rAF loop whose
 * ownership was negotiated across three files — ScrollTriggerProvider claimed
 * a ticker, this checked the claim one frame later, and self-drove if the
 * claim never arrived. Every branch of that was a way for the page to end up
 * with a Lenis that had captured the wheel and was never ticked, which is an
 * unscrollable page. It was reported as broken more than once, on desktop and
 * on phones, and the fixes kept being adjustments to the negotiation rather
 * than to the decision to negotiate at all.
 *
 * The browser already scrolls, at 120Hz, with the right momentum on every
 * platform, correctly under an open keyboard, and without a frame budget. A
 * smooth-scroll library buys an easing curve and pays for it with the single
 * most important interaction on the site.
 *
 * markLenisResolved is still called so consumers can tell "there will never be
 * a Lenis" from "not yet" — getLenis() now permanently returns null, and every
 * call site already uses optional chaining, so their scroll-lock paths fall
 * through to the CSS lock.
 *
 * Kept as a component rather than deleted so the layout tree and the capability
 * tiering above it do not have to change, and so this note has somewhere to
 * live. If you are about to reintroduce smooth scroll: don't.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    markLenisResolved();
  }, []);

  return <>{children}</>;
}
