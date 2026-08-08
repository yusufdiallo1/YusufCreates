"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Route transition for the marketing pages.
 *
 * template.tsx rather than layout.tsx: a template is given a fresh key on
 * every navigation and therefore re-mounts, which is the only reason an
 * entrance animation can run at all here. A layout persists and would animate
 * exactly once, on first load.
 *
 * The transition is deliberately small — a short rise and fade on the incoming
 * content. The glass panel sweeping across the viewport that this replaced in
 * an earlier draft was more theatrical and worse: it added ~400ms to every
 * navigation before the user could read anything, and on a site where most
 * routes resolve in under 100ms that is a delay invented for its own sake.
 *
 * The nav and footer live in layout.tsx, above this, so they never re-mount
 * and never flicker. A nav that blinks on every route change is the fastest
 * way to make a site feel broken.
 */
export default function MarketingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  /*
   * ONE TREE, ALWAYS.
   *
   * This used to `return <>{children}</>` under reduced motion, on the
   * reasoning that the content should simply be there rather than run a
   * zero-duration animation. The reasoning was right and the implementation
   * was the worst possible place to act on it: useReducedMotion is null on the
   * server and a boolean on the client, so this wrapper existed in the server
   * HTML and did not exist on a reduced-motion client — an element inserted
   * around EVERY marketing page, which failed hydration at the root and made
   * React re-render the entire route client-side.
   *
   * The intent survives as `duration: 0`. The content is at rest in the first
   * painted frame either way; the difference between that and no animation at
   * all is not perceptible, and it is certainly smaller than the difference
   * between a hydrated page and a re-rendered one.
   */
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration: 0.32,
              // The site's own easing token, so this settles like everything else.
              ease: [0.16, 1, 0.3, 1],
            }
      }
    >
      {children}
    </motion.div>
  );
}
