"use client";

import { Children, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * StackedDeck — cards that stack and recede as the next slides over them.
 *
 * A deck being dealt. Each card sticks a little lower than the one before, and
 * as the next arrives the one beneath scales down and dims, so the pile reads
 * as depth rather than as a list that happens to overlap.
 *
 * CARDS MUST BE OPAQUE. Stacked translucent glass compounds — three panels at
 * 0.4 alpha over each other is mud, and each one costs a backdrop sample of
 * everything below it. The deck is the one place on this site where glass is
 * the wrong material, so the cards get a solid fill.
 *
 * CAPPED AT FIVE. Each card's sticky offset is 12px lower than the last;
 * past five the bottom of the pile is off the viewport and the effect inverts
 * into cards disappearing under the fold.
 */

const MAX_CARDS = 5;
const STICKY_BASE = 80;
const STICKY_STEP = 12;

export function StackedDeck({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { tier } = useCapability();
  const items = Children.toArray(children).slice(0, MAX_CARDS);

  if (process.env.NODE_ENV !== "production") {
    const total = Children.count(children);
    if (total > MAX_CARDS) {
      console.warn(
        `[StackedDeck] ${total} cards given, rendering ${MAX_CARDS}. Past five ` +
          `the sticky offsets run out of viewport and cards vanish under the fold.`,
      );
    }
  }

  // Reduced and below: an ordinary stack. The cards are already in order and
  // read perfectly well without the choreography.
  if (tier !== "full") {
    return <div className={cn("flex flex-col gap-6", className)}>{items}</div>;
  }

  return (
    <div className={className}>
      {items.map((child, i) => (
        <DeckCard key={i} index={i}>
          {child}
        </DeckCard>
      ))}
    </div>
  );
}

function DeckCard({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Each card reads its own range, so it recedes only while it is actually
  // being covered rather than in step with every other card.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.2", "end 0.1"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0.5, 1], [1, 0.6]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -16]);

  return (
    <div
      ref={ref}
      className="sticky"
      style={{ top: STICKY_BASE + index * STICKY_STEP }}
    >
      <motion.div
        style={{ scale, opacity, y, transformOrigin: "center top" }}
        // Opaque, deliberately. See the note on the component.
        className="deck-card rounded-xl bg-surface-1"
      >
        {children}
      </motion.div>
    </div>
  );
}
