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
  /** How far into the viewport before triggering. */
  margin?: string;
  once?: boolean;
  className?: string;
}

export function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  y = 16,
  margin = "-10%",
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
      viewport={{ once, margin }}
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
