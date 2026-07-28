"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * CopyButton — copy to clipboard with the icon morphing in place.
 *
 * No toast. The confirmation is the icon itself: the copy glyph swaps for a
 * checkmark drawn in the same box, reverting after two seconds. The checkmark
 * uses two exact 45 degree segments with square caps and mitred joins, so it
 * shares the Y mark's geometry language.
 *
 * The result is also announced politely for screen readers, which get no
 * benefit from the visual morph.
 */

const RESET_MS = 2000;
const EASE = [0.16, 1, 0.3, 1] as const;

interface CopyButtonProps {
  /** The text placed on the clipboard. */
  value: string;
  /** Accessible name. Defaults to a generic copy label. */
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export function CopyButton({
  value,
  label = "Copy to clipboard",
  className,
  children,
}: CopyButtonProps) {
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear on unmount so a pending reset never fires into a dead component.
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setFailed(false);
      setCopied(true);
    } catch {
      // Clipboard access can be denied by permissions or a non-secure origin.
      setFailed(true);
      setCopied(false);
    }
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, RESET_MS);
  }, [value]);

  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };

  return (
    <button
      type="button"
      onClick={copy}
      data-cursor="link"
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-1",
        "text-sm text-secondary transition-colors duration-fast",
        "hover:text-primary",
        className,
      )}
    >
      {children}

      <span
        aria-hidden="true"
        className="relative inline-flex size-4 shrink-0 items-center justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.svg
              key="check"
              viewBox="0 0 16 16"
              className="absolute size-4"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.7 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE }}
            >
              {/* Two exact 45 degree segments. */}
              <motion.path
                d="M3.5 8.5 L6.5 11.5 L12.5 5.5"
                {...strokeProps}
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.25,
                  ease: EASE,
                }}
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="copy"
              viewBox="0 0 16 16"
              className="absolute size-4"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.7 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE }}
            >
              <rect x={5.5} y={5.5} width={8} height={8} {...strokeProps} />
              <path d="M10.5 2.5 H2.5 V10.5" {...strokeProps} />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>

      {/* Announced for screen readers, which cannot perceive the morph. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : failed ? "Copy failed" : ""}
      </span>
    </button>
  );
}
