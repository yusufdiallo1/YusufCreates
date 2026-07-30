"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { MiniSlide } from "@/components/ui/MiniSlide";
import { track } from "@/lib/track";
import { REFERRAL_CODE_KEY, visitorId } from "@/lib/referral";

/**
 * Greets someone who arrived through a share link and gives them their code.
 *
 * Shown once. Dismissal is written to storage and the ?ref= parameter is
 * stripped from the URL after a successful claim, because leaving it there
 * meant the panel returned on every reload and on every client-side
 * navigation within the marketing layout — a discount that keeps announcing
 * itself reads as a popup, not a gift.
 *
 * Claiming is idempotent per visitor, enforced in the mutation rather than
 * here: this component cannot be trusted to call exactly once.
 *
 * The code is stored so the inquiry form can pre-fill it. Making someone
 * remember eight characters between here and checkout is how a discount goes
 * unredeemed.
 */

/** Long enough to read and copy, short enough not to sit there. */
const AUTO_CLOSE_MS = 40_000;

const dismissKey = (ref: string) => `yc.ref.seen.${ref}`;

export function ReferralWelcome() {
  const params = useSearchParams();
  const claim = useMutation(api.referrals.claim);
  const reduceMotion = useReducedMotion();

  const [code, setCode] = useState<string | null>(null);
  // Days left, resolved once when the code arrives. Deriving it during render
  // would mean calling Date.now() there, which makes the output depend on
  // when React happens to re-render.
  const [days, setDays] = useState(14);
  const [dismissed, setDismissed] = useState(false);

  const ref = params.get("ref");
  /*
   * Held in a ref, because `?ref=` is stripped from the URL as soon as the
   * code is claimed — so by the time anyone dismisses the panel, the search
   * param it was keyed on is gone. Reading it from the URL at dismiss time
   * stored nothing, and the panel came back on the next visit.
   */
  const claimedRef = useRef<string | null>(null);

  const dismiss = useCallback(() => {
    setDismissed(true);
    const key = claimedRef.current;
    if (!key) return;
    try {
      localStorage.setItem(dismissKey(key), "1");
    } catch {
      // Private mode. The panel closes for this visit either way.
    }
  }, []);

  useEffect(() => {
    if (!ref || !isConvexConfigured) return;

    // Already seen: never claim, never render. Read here rather than during
    // render because localStorage does not exist on the server, and checked
    // before the mutation so a returning visitor costs nothing.
    try {
      if (localStorage.getItem(dismissKey(ref))) return;
    } catch {}

    let live = true;
    claim({ ref, visitor: visitorId() })
      .then((res) => {
        if (!live || !res.ok) return;
        // Remembered before the URL is rewritten below.
        claimedRef.current = ref;
        setCode(res.code);
        if (res.expiresAt) {
          setDays(
            Math.max(0, Math.ceil((res.expiresAt - Date.now()) / 86_400_000)),
          );
        }
        try {
          localStorage.setItem(REFERRAL_CODE_KEY, res.code);
        } catch {}
        track("cta_click", { step: "referral_claimed" });

        /*
         * Strip ?ref= once the code is in hand.
         *
         * replaceState rather than a router push: this must not add a history
         * entry, and it must not re-render the tree — the panel is mid-
         * animation. Without it a reload re-enters this effect and the panel
         * returns even though the code was already issued.
         */
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("ref");
          window.history.replaceState({}, "", url.toString());
        } catch {}
      })
      .catch(() => {
        // A failed claim must not block the page. They still see the site.
      });

    return () => {
      live = false;
    };
  }, [ref, claim]);

  // Closes itself. Someone who has read it and moved on should not have to
  // dismiss a panel they are no longer looking at.
  useEffect(() => {
    if (!code || dismissed) return;
    const timer = setTimeout(dismiss, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [code, dismissed, dismiss]);


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

          <p className="hairline mt-3 rounded-lg bg-surface-1 px-4 py-3 font-mono text-lg tracking-[0.2em] text-primary">
            {code}
          </p>

          <p className="mt-2 text-xs text-secondary">
            Saved for checkout. Valid {days} more {days === 1 ? "day" : "days"}.
          </p>

          {/* Slide, not tap. The code is the one thing on this panel worth
              taking, and a deliberate gesture is harder to do by accident
              than a button sitting under a thumb. Closes itself once the
              code is on the clipboard — the panel has nothing left to say. */}
          <div className="mt-4">
            <MiniSlide
              label="Slide to copy"
              pendingLabel="Copying"
              doneLabel="Copied"
              ariaLabel="Slide to copy your discount code"
              onConfirm={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                } catch {
                  // Denied permission or an insecure origin. The code is
                  // visible above and already stored for the form.
                }
                // Long enough for the tick to land before it leaves.
                setTimeout(dismiss, 900);
              }}
            />
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-3 text-xs text-secondary transition-colors duration-fast hover:text-primary"
          >
            Close
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
