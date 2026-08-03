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

  // Under reduced motion the content is simply there. Not a zero-duration
  // animation — no animation.
  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        // The site's own easing token, so this settles like everything else.
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
