"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * SpotlightGroup — a soft light that follows the cursor across a set of cards.
 *
 * The cheapest effect on the site that reads as expensive: a radial gradient
 * positioned by two custom properties, composited, never laying out.
 *
 * PERFORMANCE, which is the entire design of this component:
 *
 *   ONE listener on the group, not one per card. Twelve cards with their own
 *   pointermove handlers is twelve closures invoked per event, and the browser
 *   fires those far faster than it paints.
 *
 *   ONE write per frame. pointermove can fire several hundred times a second on
 *   a high-polling mouse; writing a custom property on each one queues a style
 *   recalculation each time. The latest position is stashed and flushed inside a
 *   single requestAnimationFrame, so the cost is bounded by the frame rate
 *   rather than by the mouse.
 *
 *   Passive listener. This handler never calls preventDefault, and saying so
 *   lets the compositor keep scrolling without waiting on it.
 *
 * Off below `full`, and off entirely without a hovering pointer — on touch
 * there is no cursor to follow and the gradient would sit wherever the last
 * tap landed.
 */
export function SpotlightGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const { tier, canHover } = useCapability();
  const active = tier === "full" && canHover;

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    let frame = 0;
    // The latest event, held until the next frame flushes it.
    let pending: { card: HTMLElement; x: number; y: number } | null = null;
    let lit: HTMLElement | null = null;

    const flush = () => {
      frame = 0;
      if (!pending) return;
      const { card, x, y } = pending;
      pending = null;

      if (lit && lit !== card) lit.style.setProperty("--spot-opacity", "0");
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
      card.style.setProperty("--spot-opacity", "1");
      lit = card;
    };

    const onMove = (event: PointerEvent) => {
      // Resolve which card is under the cursor from the event target rather
      // than by hit-testing every card.
      const card = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-spotlight]",
      );
      if (!card) {
        if (lit) {
          lit.style.setProperty("--spot-opacity", "0");
          lit = null;
        }
        return;
      }

      const rect = card.getBoundingClientRect();
      pending = {
        card,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const onLeave = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      pending = null;
      if (lit) {
        lit.style.setProperty("--spot-opacity", "0");
        lit = null;
      }
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
      // Leave no card stuck lit if the group unmounts mid-hover.
      onLeave();
    };
  }, [active]);

  return (
    <div ref={ref} className={className} data-spotlight-group={active ? "on" : undefined} {...props}>
      {children}
    </div>
  );
}

/**
 * Marks a card as a spotlight target. The gradient itself is a pseudo-element
 * defined in globals.css, so this adds no DOM.
 */
export function spotlightProps(enabled = true) {
  return enabled ? { "data-spotlight": "" as const } : {};
}

/** Convenience wrapper for a single card. */
export function Spotlight({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-spotlight="" className={cn(className)} {...props}>
      {children}
    </div>
  );
}
