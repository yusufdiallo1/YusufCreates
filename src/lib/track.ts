"use client";

/**
 * First-party analytics.
 *
 * No third-party script, no advertising identifier, and no cookie — which is
 * what lets the site run without a consent banner. The session id lives in
 * sessionStorage, so it dies with the tab and cannot follow anyone anywhere.
 *
 * Every call is fire-and-forget. Analytics must never delay a navigation or
 * break an interaction; a lost pageview costs nothing, a blocked click costs a
 * client.
 */

const SESSION_KEY = "yc.session";

/** Stable within one tab, meaningless outside it. */
export function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private browsing can refuse storage. Untracked is fine; broken is not.
    return "";
  }
}

export type EventType =
  | "pageview"
  | "cta_click"
  | "form_start"
  | "form_submit"
  | "chat_open"
  | "chat_message";

/**
 * Sent with sendBeacon where available, so it survives the page being closed
 * or navigated away from mid-request — which is exactly when a pageview or an
 * outbound CTA click would otherwise be lost.
 */
export function track(
  type: EventType,
  meta?: { path?: string; cta?: string; referrer?: string; step?: string },
): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    type,
    sessionId: sessionId(),
    path: meta?.path ?? window.location.pathname,
    meta: meta ?? {},
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never surfaces.
  }
}
