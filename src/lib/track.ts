"use client";

/**
 * First-party analytics.
 *
 * No third-party script, no advertising identifier and no cookie — which is
 * what lets the site run without a consent banner.
 *
 * Two identifiers, and the difference matters:
 *
 *   sessionId  lives in sessionStorage, dies with the tab. One visit.
 *   visitorId  lives in localStorage, survives. One browser.
 *
 * visitorId is a random value. It is not derived from anything about the
 * person, no other site can read it, and it identifies a browser rather than
 * a human. It exists because "returning visitor" and "how many days from
 * first visit to enquiry" cannot be answered without it, and both are worth
 * answering. Anyone who clears their storage becomes a new visitor, which is
 * the correct behaviour rather than a limitation.
 *
 * Do Not Track is honoured: with it set, nothing is sent at all.
 *
 * Every call is fire-and-forget. Analytics must never delay a navigation or
 * break an interaction; a lost pageview costs nothing, a blocked click costs
 * a client.
 */

const SESSION_KEY = "yc.session";
const VISITOR_KEY = "yc.visitor";

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

/** Stable across visits in one browser. Random, never derived. */
export function visitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Respects the browser's own signal. Set means send nothing. */
function doNotTrack(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const win = window as Window & { doNotTrack?: string };
  const flag = nav.doNotTrack ?? win.doNotTrack ?? nav.msDoNotTrack;
  return flag === "1" || flag === "yes";
}

export type EventType =
  | "pageview"
  | "scroll_depth"
  | "cta_click"
  | "outbound_click"
  | "form_start"
  | "form_step"
  | "form_error"
  | "form_submit"
  | "pricing_currency"
  | "pricing_slider"
  | "pricing_tier_click"
  | "promo_applied"
  | "faq_open"
  | "chat_open"
  | "chat_message"
  | "web_vital";

/**
 * Everything about the browser worth knowing, computed per call.
 *
 * Derived from the UA string and the viewport rather than a fingerprinting
 * library: this answers "does mobile convert worse than desktop" and "which
 * breakpoints actually matter", not "who is this".
 */
function context() {
  if (typeof window === "undefined") return {};

  const ua = navigator.userAgent;
  const w = window.innerWidth;

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Other";

  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";

  /* Viewport, not the UA string: a phone in landscape is still a phone, and
     UA-based device detection has been unreliable for a decade. */
  const device = w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";

  const params = new URLSearchParams(window.location.search);

  let referrer: string | undefined;
  if (document.referrer) {
    try {
      /* Hostname only. A full referring URL can carry a search query or a
         token belonging to another site, and none of that is mine to store. */
      referrer = new URL(document.referrer).hostname.replace(/^www\./, "");
    } catch {
      referrer = undefined;
    }
  }

  return {
    visitorId: visitorId(),
    device,
    browser,
    os,
    viewportW: w,
    referrer,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
}

/**
 * Sent with sendBeacon where available, so it survives the page being closed
 * or navigated away from mid-request — which is exactly when a pageview or an
 * outbound click would otherwise be lost.
 */
export function track(
  type: EventType,
  meta?: Record<string, string | number | undefined>,
): void {
  if (typeof window === "undefined") return;
  if (doNotTrack()) return;

  const body = JSON.stringify({
    type,
    sessionId: sessionId(),
    path: window.location.pathname,
    ...context(),
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
