"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";

/**
 * MiniSlide — a compact slide-to-confirm.
 *
 * The same interaction model as SlideToConfirm at a fraction of the height:
 * the label stays fully visible while an opaque thumb slides over it, a faint
 * accent trail follows, and releasing early springs the thumb back.
 *
 * Under prefers-reduced-motion it collapses to a single-press button, and the
 * checkmark appears without drawing.
 */

const TRACK_H = 44;
const THUMB_W = 52;
const PAD = 4;
const COMPLETE_AT = 0.985;
const EASE = [0.16, 1, 0.3, 1] as const;

interface MiniSlideProps {
  label: string;
  pendingLabel?: string;
  doneLabel?: string;
  ariaLabel: string;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function MiniSlide({
  label,
  pendingLabel = "Sending",
  doneLabel = "Done",
  ariaLabel,
  disabled = false,
  onConfirm,
}: MiniSlideProps) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxX, setMaxX] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const x = useMotionValue(0);

  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      setMaxX(trackRef.current.clientWidth - THUMB_W - PAD * 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const complete = useCallback(async () => {
    if (done || busy || disabled) return;
    setBusy(true);
    animate(x, maxX, { duration: 0.2, ease: EASE });
    try {
      await onConfirm();
      setDone(true);
    } catch {
      // Roll back so the control reads as untouched, not half-committed.
      animate(x, 0, { duration: 0.42, ease: EASE });
    } finally {
      setBusy(false);
    }
  }, [done, busy, disabled, maxX, onConfirm, x]);

  const inert = disabled || done || busy;
  const current = done ? doneLabel : busy ? pendingLabel : label;

  return (
    <div
      ref={trackRef}
      role="group"
      style={{
        position: "relative",
        height: TRACK_H,
        borderRadius: 9999,
        background: "var(--bg-surface-1)",
        border: "1px solid var(--border-hairline)",
        overflow: "hidden",
        opacity: disabled ? 0.5 : 1,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {/* Label never fades; the thumb passes over it.

          Centred in the track minus the parked thumb, not across the whole
          track — centring across the full width puts the text under the
          resting thumb and hides the first word on a narrow screen. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: PAD + THUMB_W,
          right: PAD,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: "var(--text-secondary)",
          pointerEvents: "none",
          paddingInline: 6,
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {current}
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
        onKeyDown={(e) => {
          if (inert) return;
          if (e.key === "Enter" || e.key === " " || e.key === "End") {
            e.preventDefault();
            void complete();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            animate(x, Math.min(maxX, x.get() + maxX / 4), { duration: 0.15 });
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            animate(x, Math.max(0, x.get() - maxX / 4), { duration: 0.15 });
          }
        }}
        drag={reduceMotion || inert ? false : "x"}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0}
        dragMomentum={false}
        onDrag={() => {
          if (x.get() >= maxX * COMPLETE_AT) void complete();
        }}
        onDragEnd={() => {
          if (!done && !busy) animate(x, 0, { duration: 0.42, ease: EASE });
        }}
        onClick={() => {
          // Reduced motion turns this into an ordinary press.
          if (reduceMotion) void complete();
        }}
        style={{
          x,
          position: "absolute",
          top: PAD,
          left: PAD,
          width: THUMB_W,
          height: TRACK_H - PAD * 2,
          borderRadius: 9999,
          background: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: reduceMotion ? "pointer" : inert ? "default" : "grab",
        }}
      >
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.path
                key="check"
                d="M3.5 8.5 L6.5 11.5 L12.5 5.5"
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeLinecap="square"
                strokeLinejoin="miter"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE }}
              />
            ) : (
              <motion.path
                key="arrow"
                d="M5 3 L10 8 L5 13"
                fill="none"
                stroke="var(--bg-canvas)"
                strokeWidth={2}
                strokeLinecap="square"
                strokeLinejoin="miter"
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>
        </svg>
      </motion.div>
    </div>
  );
}
