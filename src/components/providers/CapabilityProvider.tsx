"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  type Capability,
  commitTier,
  detectCanHover,
  detectStaticTier,
  getCapabilitySnapshot,
  getServerCapabilitySnapshot,
  subscribeCapability,
} from "@/lib/capability";
import { startFpsSampler } from "@/lib/fps-sampler";

/**
 * useCapability — what this device can afford.
 *
 * Read this in every animation component. The tier decides whether an effect
 * runs at all; see THE SSR RULE in lib/capability.ts for the constraint it
 * places on what you may branch on.
 */
export function useCapability(): Capability {
  return useSyncExternalStore(
    subscribeCapability,
    getCapabilitySnapshot,
    getServerCapabilitySnapshot,
  );
}

/**
 * CapabilityProvider — resolves the tier and publishes it to CSS.
 *
 * Renders children unconditionally. Gating render on detection would leave the
 * marketing pages blank in the HTML payload, which would cost the LCP and the
 * static render for a value that arrives one frame later anyway.
 *
 * Detection deliberately happens in an effect rather than lazily inside
 * getSnapshot. LiquidGlass can detect inside getSnapshot because its server
 * value (false) is also its correct client value nearly everywhere; tier is
 * not, so detecting during render would return something different from what
 * the server sent and mismatch hydration on every capable device.
 */
export function CapabilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tier, canHover } = useCapability();

  // Phase 1: resolve the static tier, one frame after hydration.
  useEffect(() => {
    commitTier(detectStaticTier(), detectCanHover());

    // Hover capability can change mid-session: a tablet gains a trackpad, or a
    // laptop is docked. Cheap to track, and the alternative is a cursor that
    // never appears on a device that grew a pointer.
    const hoverQuery = window.matchMedia("(hover: none)");
    const syncHover = () => commitTier(detectStaticTier(), detectCanHover());
    hoverQuery.addEventListener("change", syncHover);

    // Reduced motion is a hard floor, so a mid-session change must re-resolve.
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", syncHover);

    return () => {
      hoverQuery.removeEventListener("change", syncHover);
      motionQuery.removeEventListener("change", syncHover);
    };
  }, []);

  // Phase 2: watch real frame rate and ratchet down if the device cannot keep
  // up with what we gave it. Never starts at minimal — nothing left to demote.
  useEffect(() => {
    if (tier === "minimal") return;
    const sampler = startFpsSampler();
    return () => sampler.stop();
  }, [tier]);

  /*
   * Publish to CSS as an attribute rather than an inline style.
   *
   * The depth classes in globals.css own backdrop-filter outright — that is
   * what keeps the mobile reduction and the reduced-transparency override in
   * one place. An inline blur would win the cascade against them and quietly
   * break both, so the tier clamps live in CSS keyed off this attribute.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-capability-tier", tier);
    root.toggleAttribute("data-can-hover", canHover);
  }, [tier, canHover]);

  return <>{children}</>;
}
