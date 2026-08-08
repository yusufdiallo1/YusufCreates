"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  classify,
  commitEntryState,
  getEntryStateSnapshot,
  getServerEntryStateSnapshot,
  subscribeEntryState,
  type EntryContext,
  type EntryState,
} from "@/lib/entryState";
import { endVisit, visitSnapshot } from "@/lib/journey";
import { track } from "@/lib/track";

/**
 * useEntryContext — how this visitor arrived, and what they did last time.
 *
 * Read this anywhere a CTA, a label or an ordering should adapt. See THE SSR
 * RULE in lib/entryState.ts for the constraint it places on what you may
 * branch on: properties and text, never nodes.
 */
export function useEntryContext(): EntryContext {
  return useSyncExternalStore(
    subscribeEntryState,
    getEntryStateSnapshot,
    getServerEntryStateSnapshot,
  );
}

/** Just the state, for the many consumers that need nothing else. */
export function useEntryState(): EntryState {
  return useEntryContext().state;
}

/** Fires the analytics event at most once per tab. */
let reported = false;

/**
 * EntryStateProvider — resolves the entry state and counts the visit.
 *
 * Structurally identical to CapabilityProvider, and for the same reasons:
 * children render unconditionally, and resolution happens in a mount effect
 * rather than during render. Gating the tree on a client-only value would
 * blank the marketing pages in the HTML payload and cost the LCP for something
 * that arrives one frame later anyway.
 *
 * Detection is in an effect and not in a lazy initialiser or inside
 * getSnapshot. localStorage does not exist on the server, so resolving during
 * render would return something different from what the server sent and
 * mismatch hydration on every device that has been here before.
 *
 * `clientDomains` is a PROP, fetched on the server in the marketing layout.
 * Fetching it here would mean a round trip before the state could resolve, and
 * "referred" would arrive several hundred milliseconds into the visit — long
 * after the hero it is supposed to change.
 */
export function EntryStateProvider({
  clientDomains,
  children,
}: {
  clientDomains: string[];
  children: React.ReactNode;
}) {
  useEffect(() => {
    /*
     * Idempotent and order-independent — see visitSnapshot.
     *
     * Hero calls the same function from a LAYOUT effect, which React runs
     * before this passive one. Whoever gets there first does the visit bump
     * and both see the identical frozen snapshot, so the hero's decision about
     * whether to play its load sequence can never disagree with the state
     * committed here.
     */
    const journey = visitSnapshot();

    const state = classify({
      visits: journey.visits,
      leadAt: journey.leadAt,
      clientDomains,
    });

    commitEntryState({
      state,
      lastSection: journey.lastSection,
      lastVisitAt: journey.lastVisitAt,
    });

    if (!reported) {
      reported = true;
      track("entry_state", { label: state });
    }

    /*
     * The visit's timestamp is closed out on the way out, not on the way in.
     *
     * pagehide rather than beforeunload or visibilitychange: it is the only
     * one of the three that fires reliably on iOS when a tab is backgrounded
     * into the page cache, which is how most phone sessions actually end.
     */
    const onHide = () => endVisit();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
    // clientDomains is a server-rendered constant for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
