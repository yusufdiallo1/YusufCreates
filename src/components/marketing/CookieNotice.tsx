"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Cookie notice.
 *
 * Deliberately a notice and not a consent gate, because this site sets no
 * cookie that consent would apply to. Analytics is a first-party sessionStorage
 * id that dies with the tab, and the only cookie is the sign-in session, which
 * is strictly necessary and exempt under ePrivacy.
 *
 * Building a fake Accept/Reject dialog here would be worse than useless: it
 * would claim to gate something that does not exist, contradict the cookies
 * page, and train people to dismiss a control that never did anything. Saying
 * plainly that there is nothing to opt out of is both the honest position and
 * the better one.
 *
 * Dismissal is stored in localStorage rather than a cookie — using a cookie to
 * remember a cookie notice would be its own small joke.
 */

const KEY = "yc.cookie.ack";

export function CookieNotice() {
  /*
   * Starts closed and opens after hydration.
   *
   * Reading localStorage in a lazy initialiser runs during the first CLIENT
   * render, so the server would send no banner while the client rendered one,
   * and hydration would fail. An effect runs after hydration has committed.
   */
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      // Private mode or storage disabled — showing it every visit is the
      // harmless failure, so nothing to handle.
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="region"
          aria-label="Cookie notice"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0.16, 1, 0.3, 1] }}
          /* Above the chat pill on mobile, and inset so it never covers the
             whole viewport on a small screen. */
          className="glass-depth glass-near glass-panel fixed inset-x-4 bottom-4 z-40 mx-auto max-w-xl p-5 sm:inset-x-auto sm:right-6 sm:bottom-6"
        >
          <p className="text-sm text-primary">No tracking cookies here.</p>
          <p className="mt-2 text-xs text-secondary">
            Analytics are first-party and anonymous — no advertising
            identifiers, no third parties, nothing that follows you off this
            site. The only cookie is the one that keeps you signed in.{" "}
            <Link href="/legal/cookies" className="text-accent">
              How it works
            </Link>
          </p>

          <button
            type="button"
            onClick={dismiss}
            className="mt-4 w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 sm:w-auto"
          >
            Got it
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
