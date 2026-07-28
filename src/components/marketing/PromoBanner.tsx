"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Site-wide banner for an automatic promotion.
 *
 * Dismissal is stored per promo id, so dismissing one does not silently hide
 * the next. Nothing here is a credential — the query returns display fields
 * only, never a code.
 */

const KEY = "yc.promo.dismissed";

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
  const [remaining, setRemaining] = useState<string | null>(null);

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

  if (!promo || !promo.bannerText) return null;
  if (dismissed.includes(promo.id)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={reduceMotion ? false : { height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-50 overflow-hidden bg-[color:var(--accent-solid)] text-white"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 px-6 py-2.5 text-sm">
          <span>{promo.bannerText}</span>
          {remaining ? (
            <span className="opacity-80 tabular-nums">ends in {remaining}</span>
          ) : null}
          <button
            type="button"
            aria-label="Dismiss this announcement"
            onClick={() => {
              const next = [...dismissed, promo.id];
              setDismissed(next);
              try {
                localStorage.setItem(KEY, JSON.stringify(next));
              } catch {
                // Private browsing refuses writes; it just reappears.
              }
            }}
            className="ml-2 shrink-0 rounded-full p-1 transition-opacity duration-fast hover:opacity-70"
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
