"use client";

import { useMemo, useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * WordReveal — a paragraph that brightens word by word as it is read.
 *
 * Tied to scroll position rather than to a timer, so the copy resolves at the
 * pace the reader arrives at it rather than at a pace chosen for them.
 *
 * AN EMPHASIS DEVICE. Correct on a handful of statements of intent; wrong on
 * body copy generally. Applied everywhere it stops meaning anything and turns
 * reading the page into waiting for it.
 *
 * ---------------------------------------------------------------------------
 * ACCESSIBILITY: THE TEXT IS NEVER GATED.
 *
 * Every word is in the DOM, in order, at full size, from first paint. What
 * animates is opacity between 0.28 and 1 — dim, never absent. A screen reader
 * reads the whole paragraph at any scroll position, and with JavaScript off
 * the text is simply there.
 *
 * The dim state is deliberately 0.28 rather than 0: unread words must still
 * be legible, because the effect is emphasis rather than a reveal.
 * ---------------------------------------------------------------------------
 */

export interface WordRevealProps {
  children: string;
  as?: "p" | "h2" | "h3" | "blockquote";
  className?: string;
}

export function WordReveal({
  children,
  as: Tag = "p",
  className,
}: WordRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const { tier } = useCapability();

  /*
   * Split into tokens, and give each real word its ordinal up front.
   *
   * Computed here rather than by incrementing a counter inside the map: a
   * variable mutated during render is a hazard under concurrent rendering,
   * where a render can be abandoned and restarted part-way through.
   */
  const tokens = useMemo(() => {
    let ordinal = 0;
    const parts = children.split(/(\s+)/);
    return parts.map((text) => {
      const isWord = text.trim().length > 0;
      return { text, isWord, ordinal: isWord ? ordinal++ : -1 };
    });
  }, [children]);

  const total = useMemo(
    () => tokens.filter((t) => t.isWord).length,
    [tokens],
  );

  const { scrollYProgress } = useScroll({
    target: ref,
    // Resolves across the upper half of the viewport: begins as the paragraph
    // rises into view, finishes before it reaches comfortable reading height.
    offset: ["start 0.85", "start 0.35"],
  });

  // Below full, the paragraph is simply a paragraph.
  if (tier !== "full") {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag ref={ref as React.Ref<never>} className={cn(className)}>
      {tokens.map((token, i) =>
        // Whitespace stays a plain text node rather than becoming a flex gap,
        // so selection, line breaking and copy-paste all behave normally.
        token.isWord ? (
          <Word
            key={i}
            progress={scrollYProgress}
            index={token.ordinal}
            total={total}
          >
            {token.text}
          </Word>
        ) : (
          token.text
        ),
      )}
    </Tag>
  );
}

/**
 * Each word is its own component because it calls useTransform, and a hook
 * called inside a .map() in the parent would break the rules of hooks the
 * moment the word count changed.
 */
function Word({
  children,
  progress,
  index,
  total,
}: {
  children: string;
  progress: MotionValue<number>;
  index: number;
  total: number;
}) {
  const start = index / total;
  const end = start + 1 / total;
  const opacity = useTransform(progress, [start, end], [0.28, 1]);

  return <motion.span style={{ opacity }}>{children}</motion.span>;
}
