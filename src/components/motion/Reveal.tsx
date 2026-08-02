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
   * A small pixel inset, NOT a percentage.
   *
   * This was "-10%", which shrinks the root by a tenth of the viewport at
   * top AND bottom. A tall block sitting just below the fold — the express
   * order form at 689px in a 735px window — then had only ~46px inside a
   * trigger line drawn at 662px, so it never fired: the form rendered at
   * opacity 0 and stayed there until something happened to scroll the page.
   * An order form that is invisible on arrival is indistinguishable from a
   * broken page.
   *
   * A fixed inset cannot scale into that failure, and `amount` below is what
   * actually delays the trigger.
   */
  margin = "-40px",
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
