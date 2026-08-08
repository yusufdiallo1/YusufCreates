"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Reveal — generic fade and rise on viewport entry.
 *
 * The default wrapper for anything that should arrive rather than simply be
 * there. Only transform and opacity are animated.
 */

interface RevealProps {
  children: React.ReactNode;
  /** Seconds before the animation starts. */
  delay?: number;
  duration?: number;
  /** Pixels risen from. Negative values drop in from above. */
  y?: number;
  /**
   * How far into the viewport before triggering, as an IntersectionObserver
   * rootMargin.
   *
   * Negative values shrink the root, so the element has to travel further in
   * before it counts as visible. Keep it small: the margin is subtracted from
   * a viewport whose height is unknown, and anything large enough to matter
   * on a desktop is most of a phone screen.
   */
  margin?: string;
  once?: boolean;
  className?: string;
}

export function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  y = 16,
  /*
   * NO inset by default. Touching the viewport is enough.
   *
   * This was "-10%", then "-40px", and both shrink the trigger area at the
   * top AND bottom edges. Any element that only ever peeks into the last few
   * pixels of the fold then sits permanently outside it and never animates
   * in — it renders at opacity 0 and simply stays there. The express order
   * form does exactly that at 1280x720, the commonest laptop viewport
   * there is: it starts at 690px with 30px on screen, inside a boundary
   * drawn at 680px.
   *
   * A page that is invisible until you happen to scroll is indistinguishable
   * from a broken one, and no amount of inset is worth that. The stagger
   * comes from `delay`, and `amount` below decides how much must be visible
   * — neither needs the root resized.
   */
  margin = "0px",
  once = true,
  className,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  /*
   * REDUCED MOTION CHANGES THE TIMING, NEVER THE MARKUP.
   *
   * Two rounds of this bug have been fixed here. The first was returning a
   * plain <div> for reduced motion and a motion.div otherwise, which changed
   * the ELEMENT TYPE between the passes. The second — this one — kept the
   * element stable but still varied `initial` and `whileInView`, which changes
   * the ATTRIBUTES: `initial` is what Motion serialises into the style
   * attribute, so the server sent `opacity:0;transform:translateY(16px)` where
   * a reduced-motion client wanted no style at all.
   *
   * Both failed for the same underlying reason. useReducedMotion returns null
   * on the server and a boolean on the client, so ANYTHING derived from it that
   * reaches the DOM disagrees between the two passes. There are dozens of
   * Reveals on a page and every one of them mismatched, so React discarded the
   * whole tree and re-rendered it client-side.
   *
   * So `initial` and `whileInView` are unconditional, and only `transition`
   * varies — `transition` is read by Motion when the animation runs and never
   * reaches the DOM. duration 0 is not a compromise: the element is at rest in
   * the same frame it is observed, which is what "no animation" means to the
   * person who asked for it.
   *
   * The one thing that must NOT be done is gating `whileInView` on its own.
   * Leaving `initial` set while removing the thing that animates away from it
   * leaves every element on the page permanently at opacity 0.
   */
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      /*
       * `amount: "some"` — any intersection at all is enough.
       *
       * The default already behaves this way, but it is stated explicitly
       * because the alternative ("all", or a ratio) is quietly unsatisfiable
       * for any element taller than the viewport: it can never be fully
       * inside, so it would never animate in. Several blocks on this site are
       * that tall on a phone.
       */
      viewport={{ once, margin, amount: "some" }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration, delay, ease: [0.16, 1, 0.3, 1] }
      }
      /*
       * will-change is a promise to the compositor that costs a GPU layer per
       * element for as long as it is set. Reveal is used dozens of times per
       * page, so leaving it on permanently pinned ~77 layers on the homepage
       * and made every later interaction — opening the nav especially — fight
       * for compositor time on a phone.
       *
       * Motion sets it while animating and clears it on completion, which is
       * exactly the correct lifetime. Declaring it here defeated that.
       */
    >
      {children}
    </motion.div>
  );
}
