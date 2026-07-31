"use client";

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * SlideToConfirm — deliberate-friction control for irreversible actions.
 *
 * Interaction model, matching Resend's OAuth confirm:
 *   - The label stays fully visible and does NOT fade. The thumb is opaque and
 *     physically slides over it. This is what makes the control feel like an
 *     object rather than a progress bar.
 *   - The track is a recessed groove, the thumb sits above it.
 *   - The track can be grabbed anywhere, not only on the thumb.
 *   - An accent-tinted trail follows the thumb and the rim brightens with
 *     progress, so commitment is visible before it completes.
 *   - Releasing before the end springs the thumb back.
 *   - On completion the Y mark fades and a checkmark draws in the same thumb.
 *
 * The label shimmers gently until first interaction. That is the affordance
 * telling people it is draggable, borrowed from slide-to-unlock. It stops
 * permanently once touched so it never nags.
 *
 * Only use this where the action cannot be cleanly undone: submitting a lead,
 * handing off to payment, starting a subscription, sending a broadcast,
 * deleting a record. On an ordinary button it is just an annoying gimmick.
 *
 * Accessibility is not optional. Drag-only would exclude keyboard and switch
 * users, so this exposes role="slider", arrow-key stepping, and Enter or Space
 * to complete. Under prefers-reduced-motion it becomes a single-press button,
 * the shimmer never runs, and the checkmark appears without drawing.
 */

export type SlideSignals = {
  durationMs: number;
  pointerSamples: number;
  peakVelocity: number;
  usedKeyboard: boolean;
};

export type SlidePurpose =
  | "submit-lead"
  | "to-payment"
  | "start-subscription"
  | "send-broadcast"
  | "send-invoice"
  | "mark-paid"
  | "activate-promo"
  | "delete";

type SlideToConfirmProps = {
  purpose: SlidePurpose;
  label?: string;
  completedLabel?: string;
  pendingLabel?: string;
  ariaLabel: string;
  onConfirm: (signals: SlideSignals) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

const COPY: Record<
  SlidePurpose,
  { label: string; pending: string; done: string; danger: boolean }
> = {
  "submit-lead": {
    label: "Slide to send",
    pending: "Sending",
    done: "Sent",
    danger: false,
  },
  "to-payment": {
    label: "Slide to continue to payment",
    pending: "Opening checkout",
    done: "Redirecting",
    danger: false,
  },
  "start-subscription": {
    label: "Slide to start your Care Plan",
    pending: "Setting up",
    done: "Started",
    danger: false,
  },
  "send-broadcast": {
    label: "Slide to send",
    pending: "Sending",
    done: "Sent",
    danger: false,
  },
  "send-invoice": {
    label: "Slide to issue invoice",
    pending: "Issuing",
    done: "Issued",
    danger: false,
  },
  // Not destructive, but not cleanly reversible either: it closes the money
  // record and stops the chasing. Telling a client they still owe you after
  // marking it settled is the conversation this friction prevents.
  "mark-paid": {
    label: "Slide to mark paid",
    pending: "Recording",
    done: "Paid",
    danger: false,
  },
  // A site-wide discount going live is not something to fire on a stray click.
  "activate-promo": {
    label: "Slide to activate",
    pending: "Activating",
    done: "Live",
    danger: false,
  },
  delete: {
    label: "Slide to delete",
    pending: "Deleting",
    done: "Deleted",
    danger: true,
  },
};

const TRACK_H = 64;
const THUMB_W = 88;
/** Label type scales between these to fit beside the thumb without truncating. */
const LABEL_SIZE_MAX = 15;
const LABEL_SIZE_MIN = 12;
const THUMB_H = 54;
const PAD = 5;
const COMPLETE_AT = 0.985;

const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";
/** Two exact 45 degree segments, same stroke language as the mark. */
const CHECK = "M75 105 L100 130 L150 80";

const EASE = [0.16, 1, 0.3, 1] as const;

const SHIMMER_CSS = `
@keyframes yc-slide-shimmer {
  0%   { background-position: 140% 0; }
  100% { background-position: -140% 0; }
}
.yc-slide-shimmer {
  background: linear-gradient(90deg,
    var(--text-secondary, #8a8f98) 0%,
    var(--text-secondary, #8a8f98) 38%,
    var(--text-primary, #f7f8f8) 50%,
    var(--text-secondary, #8a8f98) 62%,
    var(--text-secondary, #8a8f98) 100%);
  background-size: 280% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: yc-slide-shimmer 3.4s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .yc-slide-shimmer { animation: none; -webkit-text-fill-color: currentColor; background: none; }
}
`;

function hexish(varExpr: string, fallback: [number, number, number]) {
  return fallback;
}

export function SlideToConfirm({
  purpose,
  label,
  completedLabel,
  pendingLabel,
  ariaLabel,
  onConfirm,
  disabled = false,
  className,
}: SlideToConfirmProps) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxX, setMaxX] = useState(0);
  /** Measured thumb width. Shrinks on narrow tracks; see the measure effect. */
  const [thumbW, setThumbW] = useState(THUMB_W);
  const [labelSize, setLabelSize] = useState(LABEL_SIZE_MAX);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const copy = COPY[purpose];
  const accent = copy.danger
    ? "var(--danger, #e5484d)"
    : "var(--accent, #5e6ad2)";
  const rgb = hexish(accent, copy.danger ? [229, 72, 77] : [94, 106, 210]);

  // Declared before the measure effect, which re-fits the label whenever the
  // text changes between its resting, pending and done states.
  const currentLabel = done
    ? completedLabel ?? copy.done
    : busy
      ? pendingLabel ?? copy.pending
      : label ?? copy.label;

  const x = useMotionValue(0);
  const safeMax = Math.max(maxX, 1);

  /** Accent trail that follows the thumb. */
  const fillWidth = useTransform(x, (v) => `${PAD + v + thumbW / 2}px`);
  const fillBg = useTransform(x, [0, safeMax], [
    `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.05)`,
    `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.18)`,
  ]);
  /** Recessed groove whose rim brightens with progress. */
  const trackShadow = useTransform(x, [0, safeMax], [
    "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 0.5px rgba(255,255,255,0.09)",
    "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 0.5px rgba(255,255,255,0.31)",
  ]);

  const signals = useRef({ start: 0, samples: 0, peak: 0, keyboard: false });

  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      const width = trackRef.current.clientWidth;
      // The thumb shrinks on narrow tracks. At the fixed 88px it covered 43%
      // of a 320px-screen track, leaving too little room for the label beside
      // it. Never below 64px, which is still a comfortable touch target.
      const thumb = Math.max(64, Math.min(THUMB_W, Math.round(width * 0.28)));
      setThumbW(thumb);
      setMaxX(width - thumb - PAD * 2);

      // Shrink the label until it fits the space beside the thumb. Measured
      // rather than guessed from a breakpoint, because the label text varies
      // by purpose — "Slide to start your Care Plan" needs more room than
      // "Slide to send".
      const el = labelRef.current;
      if (!el) return;
      const available = width - thumb - PAD * 2 - 16;
      let size = LABEL_SIZE_MAX;
      el.style.fontSize = `${size}px`;
      while (size > LABEL_SIZE_MIN && el.scrollWidth > available) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      setLabelSize(size);
    };
    measure();
    window.addEventListener("resize", measure);

    /*
     * Re-measured whenever the track itself changes size, not only when the
     * window does.
     *
     * These sit inside drawers, modals and tab panels that are laid out after
     * mount — and inside a container that is display:none at that moment the
     * track measures 0, which makes maxX 0 and the thumb immovable. The
     * control then looks broken in exactly the way a stuck slider looks
     * broken: it accepts the drag and goes nowhere.
     */
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer && trackRef.current) observer.observe(trackRef.current);

    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
    // currentLabel changes as the control moves through pending and done, and
    // those strings differ in length, so the fit has to be recomputed.
  }, [currentLabel]);

  const markTouched = () => {
    if (!touched) setTouched(true);
    if (!signals.current.start) signals.current.start = Date.now();
  };

  const complete = useCallback(async () => {
    if (done || busy || disabled) return;
    setBusy(true);
    animate(x, maxX, { duration: 0.2, ease: EASE });
    const s = signals.current;
    try {
      await onConfirm({
        durationMs: s.start ? Date.now() - s.start : 0,
        pointerSamples: s.samples,
        peakVelocity: Math.round(s.peak),
        usedKeyboard: s.keyboard,
      });
      setDone(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch {
      animate(x, 0, { duration: 0.42, ease: EASE });
    } finally {
      setBusy(false);
    }
  }, [done, busy, disabled, maxX, onConfirm, x]);

  /** Grabbing the bare track jumps the thumb under the pointer. */
  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (disabled || done || busy || reduceMotion) return;
    markTouched();
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const local = e.clientX - rect.left - PAD - thumbW / 2;
    if (local <= x.get() + thumbW && local >= x.get() - thumbW) return;
    animate(x, Math.max(0, Math.min(maxX, local)), {
      duration: 0.25,
      ease: EASE,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || done || busy) return;
    markTouched();
    signals.current.keyboard = true;

    const step = maxX / 6;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      animate(x, Math.min(maxX, x.get() + step), { duration: 0.15 });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      animate(x, Math.max(0, x.get() - step), { duration: 0.15 });
    } else if (e.key === "Enter" || e.key === " " || e.key === "End") {
      e.preventDefault();
      void complete();
    }
  };


  const inert = disabled || done || busy;
  const shimmering = !touched && !inert && !reduceMotion;

  const strokeProps = {
    fill: "none",
    stroke: "#0f1011",
    strokeWidth: 15,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };

  return (
    <div className={className}>
      <style dangerouslySetInnerHTML={{ __html: SHIMMER_CSS }} />

      <motion.div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        style={{
          position: "relative",
          height: TRACK_H,
          borderRadius: 9999,
          background: "#131416",
          boxShadow: done
            ? `inset 0 0 0 0.5px ${accent}`
            : trackShadow,
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
          cursor: inert ? "default" : "pointer",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: done ? "100%" : fillWidth,
            background: done
              ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.16)`
              : fillBg,
            pointerEvents: "none",
          }}
        />

        {/*
          Label never fades. The thumb is opaque and slides over it.

          Centred within the track MINUS the parked thumb, not within the whole
          track. Centring across the full width puts the text under the resting
          thumb, which on a narrow phone hides the first word or two — an 88px
          thumb covers 43% of a 206px track at 320px. Offsetting by the thumb
          width centres it in the space the reader can actually see, and the
          label still passes behind the thumb as it travels, which is the
          intended effect.

          minWidth: 0 plus the ellipsis rules mean a long label degrades to a
          truncation rather than overflowing the pill on the narrowest screens.
        */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: PAD + thumbW,
            right: PAD,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Scales with the space actually left beside the thumb, so the
            // full label fits rather than being truncated. Floors at 12px —
            // below that it stops being readable, and the right answer then is
            // a shorter label, not smaller type.
            fontSize: labelSize,
            pointerEvents: "none",
            paddingInline: 8,
          }}
        >
          <span
            ref={labelRef}
            className={shimmering ? "yc-slide-shimmer" : undefined}
            style={{
              color: done
                ? "var(--text-primary, #f7f8f8)"
                : "var(--text-secondary, #8a8f98)",
              transition: "color 0.3s",
              minWidth: 0,
              // No ellipsis: the whole instruction has to be readable, and a
              // half-shown "Slide to start your Care…" is worse than smaller
              // type. Wrapping is prevented so it stays on one line.
              whiteSpace: "nowrap",
            }}
          >
            {currentLabel}
          </span>
        </div>

        <motion.div
          role="slider"
          tabIndex={inert ? -1 : 0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={done ? 100 : 0}
          aria-disabled={inert}
          aria-busy={busy}
          onKeyDown={onKeyDown}
          drag={reduceMotion || inert ? false : "x"}
          dragConstraints={{ left: 0, right: maxX }}
          dragElastic={0}
          dragMomentum={false}
          onPointerDown={markTouched}
          onDrag={(_, info) => {
            signals.current.samples += 1;
            const v = Math.abs(info.velocity.x);
            if (v > signals.current.peak) signals.current.peak = v;
            if (x.get() >= maxX * COMPLETE_AT) void complete();
          }}
          onDragEnd={() => {
            if (!done && !busy) {
              animate(x, 0, { duration: 0.42, ease: EASE });
            }
          }}
          onClick={() => {
            if (reduceMotion) void complete();
          }}
          animate={done ? { scale: [1, 1.07, 1] } : undefined}
          whileTap={reduceMotion || inert ? undefined : { scale: 1.045 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{
            x,
            position: "absolute",
            top: PAD,
            left: PAD,
            width: thumbW,
            height: THUMB_H,
            borderRadius: 9999,
            background: "linear-gradient(180deg, #ffffff 0%, #eceef1 100%)",
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: reduceMotion ? "pointer" : inert ? "default" : "grab",
          }}
        >
          <svg width={28} height={31} viewBox="40 30 140 155" aria-hidden>
            <AnimatePresence mode="wait">
              {!done ? (
                <motion.g
                  key="mark"
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <path d={CHEVRON} {...strokeProps} />
                  <path d={ARM} {...strokeProps} />
                  <rect x={99} y={155} width={34} height={17} fill={accent} />
                </motion.g>
              ) : (
                <motion.path
                  key="check"
                  d={CHECK}
                  {...strokeProps}
                  stroke={accent}
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.35,
                    delay: reduceMotion ? 0 : 0.12,
                    ease: EASE,
                  }}
                />
              )}
            </AnimatePresence>
          </svg>
        </motion.div>
      </motion.div>

      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary, #8a8f98)",
          textAlign: "center",
          margin: "12px 0 0",
        }}
      >
        {reduceMotion
          ? "Press to confirm."
          : "Drag the mark, or focus it and press Enter."}
      </p>
    </div>
  );
}
