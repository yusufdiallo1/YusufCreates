"use client";

/*
 * ViewTransition comes from the React canary that Next bundles for the App
 * Router (19.3.0-canary at the time of writing), not from the stable react in
 * package.json — the app's "react" specifier resolves to that build. The cast
 * is because @types/react ships the type in canary.d.ts, which the stable
 * types entry point does not re-export.
 */
import * as React from "react";
import { useCapability } from "@/components/providers/CapabilityProvider";

const ViewTransition = (
  React as unknown as {
    ViewTransition?: React.ComponentType<{
      name?: string;
      share?: string;
      children: React.ReactNode;
    }>;
  }
).ViewTransition;

/**
 * SharedElement — one object persisting across a navigation.
 *
 * When a thing on the old page and a thing on the new page share a name, the
 * browser animates between their positions instead of cross-fading them out
 * and in. The user sees the project card BECOME the case study hero, which
 * says "this is the same thing you clicked" more directly than any label.
 *
 * React's <ViewTransition> does the matching. The older manual approach —
 * document.startViewTransition plus hand-assigned view-transition-name — is
 * unnecessary here and gets the back button wrong more often than not.
 *
 * Degrades in three ways, all silent:
 *   - Below `full`, renders children untouched and navigation is plain.
 *   - Without the experimental flag, the component is inert.
 *   - Without browser support, the App Router simply navigates.
 */

export interface SharedElementProps {
  /**
   * Must match on both pages. Derived from the project slug so the pairing is
   * a consequence of the data rather than something to keep in sync by hand.
   */
  name: string;
  children: React.ReactNode;
}

export function SharedElement({ name, children }: SharedElementProps) {
  const { tier } = useCapability();

  // A morph is motion across the viewport, which is the most common trigger
  // for motion sensitivity — so it needs the full tier, not merely support.
  // The runtime check covers a React build without the component at all.
  if (tier !== "full" || !ViewTransition) return <>{children}</>;

  return (
    <ViewTransition name={name} share="morph">
      {children}
    </ViewTransition>
  );
}

/**
 * Names are generated in one place so the two ends cannot drift apart. A
 * mismatched pair does not error — it silently cross-fades instead of
 * morphing, which is the kind of bug that survives review.
 */
export const sharedNames = {
  projectCover: (slug: string) => `project-cover-${slug}`,
  projectTitle: (slug: string) => `project-title-${slug}`,
};
