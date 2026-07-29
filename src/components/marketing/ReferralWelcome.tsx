"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { track } from "@/lib/track";

/**
 * Greets someone who arrived through a share link and gives them their code.
 *
 * Claiming is idempotent per referral id, so a reload or a second visit
 * returns the same code rather than minting another. That is enforced in the
 * mutation, not here — this component cannot be trusted to call once.
 *
 * The code is shown, copyable, and stored so the pricing page can pre-fill it.
 * Making someone remember an eight-character code between here and checkout is
 * how a discount goes unredeemed.
 */

const STORED_CODE = "yc.refcode";

export function ReferralWelcome() {
  const params = useSearchParams();
  const claim = useMutation(api.referrals.claim);
  const reduceMotion = useReducedMotion();

  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const ref = params.get("ref");

  useEffect(() => {
    if (!ref || !isConvexConfigured) return;

    let live = true;
    claim({ ref })
      .then((res) => {
        if (!live || !res.ok) return;
        setCode(res.code);
        setExpiresAt(res.expiresAt);
        try {
          localStorage.setItem(STORED_CODE, res.code);
        } catch {}
        track("cta_click", { step: "referral_claimed" });
      })
      .catch(() => {
        // A failed claim must not block the page. They still see the site.
      });

    return () => {
      live = false;
    };
  }, [ref, claim]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const days = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000))
    : 14;

  return (
    <AnimatePresence>
      {code && !dismissed ? (
        <motion.div
          role="status"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
          transition={{
            duration: reduceMotion ? 0.15 : 0.45,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="glass-depth glass-near glass-panel fixed inset-x-4 top-24 z-40 mx-auto max-w-md p-5 text-center"
        >
          <p className="text-sm text-primary">
            Someone sent you here — here&apos;s 10% off.
          </p>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {}
            }}
            className="hairline mt-3 w-full rounded-lg bg-surface-1 px-4 py-3 font-mono text-lg tracking-[0.2em] text-primary transition-colors duration-fast hover:bg-surface-2"
          >
            {code}
          </button>

          <p className="mt-2 text-xs text-secondary" aria-live="polite">
            {copied
              ? "Copied."
              : `Tap to copy. Valid ${days} more ${days === 1 ? "day" : "days"}.`}
          </p>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="mt-3 text-xs text-secondary transition-colors duration-fast hover:text-primary"
          >
            Close
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
