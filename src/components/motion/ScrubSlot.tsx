"use client";

import { useEffect, useState } from "react";
import {
  type ScrubFallback,
  registerScrubCandidate,
} from "@/lib/scrub-budget";
import { useCapability } from "@/components/providers/CapabilityProvider";

export interface ScrubSlot {
  /** True only for the sequence holding the page's slot. */
  active: boolean;
  /** False until arbitration has run. Render the fallback until then. */
  resolved: boolean;
  /** What a loser should render. */
  fallback: ScrubFallback;
}

export interface UseScrubSlotOptions {
  priority?: number;
  /**
   * What to render when this sequence does not get the slot.
   *
   * "final" — the state at progress 1. Correct when the end state stands alone.
   * "entry" — the state at progress 0, then a plain in-view reveal. Correct
   *           when the end state assumes the intermediate frames were seen,
   *           which is common: elements left offset, scaled or mid-composition
   *           read as broken rather than finished.
   */
  fallback?: ScrubFallback;
}

/**
 * Claim the page's one scrubbed-sequence slot.
 *
 * Structural note: the tall wrapper a scrubbed sequence needs is STRUCTURE, not
 * effect. It must render whenever the tier is not minimal, regardless of
 * whether this sequence won the slot — otherwise winning it one frame after
 * hydration changes the page height and jumps the scroll. Only the scroll
 * binding itself keys off `active && canScrub`.
 */
export function useScrubSlot({
  priority = 0,
  fallback = "final",
}: UseScrubSlotOptions = {}): ScrubSlot {
  const { canScrub } = useCapability();
  const [state, setState] = useState({ active: false, resolved: false });

  useEffect(() => {
    if (!canScrub) return;
    return registerScrubCandidate({
      priority,
      notify: (active, resolved) => setState({ active, resolved }),
    });
  }, [priority, canScrub]);

  if (!canScrub) {
    // Nothing to arbitrate: resolved immediately so callers render the
    // fallback now rather than holding an indeterminate state.
    return { active: false, resolved: true, fallback };
  }

  return { ...state, fallback };
}
