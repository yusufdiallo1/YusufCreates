"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * A floating announcement — a promo, or a plain notice from settings.
 *
 * Bottom-left glass card rather than a bar across the top: the bar covered
 * the first thing on the page for its whole life, and pushed the layout down
 * when it arrived. This blocks nothing, so it can afford to arrive gently and
 * leave on its own after fifteen seconds.
 *
 * Left, not right — the chat pill owns the bottom-right corner.
 *
 * Dismissal is stored per id, so dismissing one does not silently hide the
 * next. Nothing here is a credential: the query returns display fields only,
 * never a code.
 */

const KEY = "yc.promo.dismissed";
const EASE = [0.16, 1, 0.3, 1] as const;

export function PromoBanner() {
  const promo = useQuery(
    api.promos.activeAutomatic,
    isConvexConfigured ? {} : "skip",
  );
  const reduceMotion = useReducedMotion();
  // Read once on the first client render rather than in an effect, which
  // would cascade an extra render for a value the first paint needs.
  const [dismissed, setDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });
  const copy = useQuery(
    api.settings.publicCopy,
    isConvexConfigured ? {} : "skip",
  );
  const [remaining, setRemaining] = useState<string | null>(null);
  /** Retired after its moment, or as soon as the reader moves past it. */
  const [hidden, setHidden] = useState(false);

  /*
   * Fifteen seconds, or the first scroll — whichever comes first.
   *
   * A banner pinned over the nav for the whole visit is a banner that has
   * stopped being an announcement and started being furniture. Scrolling is
   * the clearest signal someone has read it and moved on, and the timer
   * covers the case where they simply left it on screen.
   */
  useEffect(() => {
    if (!promo?.bannerText && !copy?.noticeText) return;

    /*
     * Fifteen seconds, then it leaves on its own.
     *
     * Scroll no longer dismisses it. That rule existed because the bar
     * covered the top of the page and scrolling meant "I have read this and
     * want it gone" — a card in the corner blocks nothing, so vanishing the
     * moment someone scrolls would just mean most people never see it.
     */
    const timer = setTimeout(() => setHidden(true), 15_000);
    return () => clearTimeout(timer);
  }, [promo?.bannerText, copy?.noticeText]);

  // Countdown ticks once a minute, not once a second. A ticking seconds
  // counter on a discount reads as a pressure tactic — the kind of thing that
  // makes people trust a site less, not more.
  useEffect(() => {
    if (!promo?.showCountdown || !promo.endsAt) return;

    const tick = () => {
      const ms = promo.endsAt! - Date.now();
      if (ms <= 0) {
        setRemaining(null);
        return;
      }
      const days = Math.floor(ms / 86_400_000);
      const hours = Math.floor((ms % 86_400_000) / 3_600_000);
      const mins = Math.floor((ms % 3_600_000) / 60_000);
      setRemaining(
        days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
      );
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [promo?.showCountdown, promo?.endsAt]);

  /*
   * A promo banner, or a plain announcement.
   *
   * Both occupy the same bar because two stacked bars is one too many. A
   * promo wins when both are set: it carries a discount, which is the more
   * urgent of the two.
   */
  const text = promo?.bannerText ?? copy?.noticeText ?? null;
  const id = promo?.id ?? "notice";

  if (!text) return null;
  if (dismissed.includes(id)) return null;
  if (hidden) return null;

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        /*
         * A floating glass card, not a bar across the top.
         *
         * The bar version sat over the nav for its whole life and covered
         * the first thing on the page. This is anchored bottom-left, clear
         * of the chat pill on the right and of anything anyone is reading —
         * it arrives, says its piece, and leaves.
         */
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.5 } }
        }
        transition={{ duration: reduceMotion ? 0.15 : 0.55, ease: EASE }}
        className="glass-depth glass-near glass-panel fixed bottom-5 left-5 z-40 max-w-[min(22rem,calc(100vw-2.5rem))] p-4 lg:bottom-8 lg:left-8"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
          />

          <div className="min-w-0">
            <p className="text-sm text-primary">{text}</p>
            {remaining ? (
              <p className="mt-1 text-xs text-secondary tabular-nums">
                Ends in {remaining}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Dismiss this announcement"
            onClick={() => {
              const next = [...dismissed, id];
              setDismissed(next);
              try {
                localStorage.setItem(KEY, JSON.stringify(next));
              } catch {
                // Private browsing refuses writes; it just reappears.
              }
            }}
            className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-secondary transition-colors duration-hover ease-hover hover:bg-surface-2 hover:text-primary"
          >
            <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
