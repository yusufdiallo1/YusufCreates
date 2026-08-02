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
   * One element type in both passes.
   *
   * Returning a plain <div> for reduced motion and a motion.div otherwise
   * broke hydration: useReducedMotion is null on the server and resolves to a
   * boolean on the client, so the server sent a <div> where the client wanted
   * a motion.div. React cannot patch a changed element type — it throws the
   * subtree away and re-renders it, on every Reveal on the page.
   *
   * Keeping the component stable and varying only the animation props means
   * reduced motion still renders at rest, without the mismatch.
   */
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
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
