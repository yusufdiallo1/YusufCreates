"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { registerBlurCandidate, setBlurCapacity } from "@/lib/blur-budget";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * A verdict inherited from an ancestor group, or null when there is none.
 *
 * Exists for one specific problem: cards inside a Marquee traverse the viewport
 * under their own motion, continuously, whether or not the user scrolls. No
 * amount of scroll hysteresis fixes that — the elements genuinely are entering
 * and leaving. Registering each card would strobe the whole row.
 *
 * The compositor cost is the row anyway, so the row registers once and its
 * cards read the answer from here.
 */
const GroupVerdict = createContext<boolean | null>(null);

export interface UseBlurBudgetOptions {
  /** Higher wins. Ties break by document order. */
  priority?: number;
  /** Skip registration entirely — e.g. an element too large to afford blur. */
  enabled?: boolean;
}

/**
 * May this element blur?
 *
 * Returns false when the budget is spent, so the caller falls back to a solid
 * background. Under an ancestor BlurBudgetGroup the group's verdict is returned
 * and this element never registers on its own.
 */
export function useBlurBudget(
  ref: React.RefObject<HTMLElement | null>,
  { priority = 0, enabled = true }: UseBlurBudgetOptions = {},
): boolean {
  const inherited = useContext(GroupVerdict);
  const { canBlur, maxBlurredElements } = useCapability();
  const [winner, setWinner] = useState(false);

  // Keep the shared ceiling in step with the tier.
  useEffect(() => {
    setBlurCapacity(maxBlurredElements);
  }, [maxBlurredElements]);

  const shouldRegister = enabled && canBlur && inherited === null;

  useEffect(() => {
    if (!shouldRegister) return;
    const el = ref.current;
    if (!el) return;
    return registerBlurCandidate(el, { priority, notify: setWinner });
  }, [ref, priority, shouldRegister]);

  if (!canBlur) return false;
  if (inherited !== null) return inherited;
  return winner;
}

/**
 * Registers one budget entry for a whole group of glass surfaces.
 *
 * Use where many small glass elements share one compositing region — a marquee
 * row, a dense card grid — so the budget tracks the real cost rather than the
 * element count.
 */
export function BlurBudgetGroup({
  priority = 0,
  className,
  children,
}: {
  priority?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const verdict = useBlurBudget(ref, { priority });

  return (
    <div ref={ref} className={className} data-blur-group={verdict ? "on" : "off"}>
      <GroupVerdict.Provider value={verdict}>{children}</GroupVerdict.Provider>
    </div>
  );
}
