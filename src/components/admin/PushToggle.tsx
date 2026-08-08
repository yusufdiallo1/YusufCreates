"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Turns browser push on for this device.
 *
 * Per-device, not per-account, because that is what a push subscription
 * actually is: my laptop and my phone are two separate endpoints and I want
 * the 3am alert on exactly one of them.
 *
 * Never offered to clients. A client wants a considered email explaining what
 * happened and what is being done about it — not a buzz about a blip that
 * resolved before they read it. See emails/SiteIncident.tsx.
 *
 * Renders nothing at all when push cannot work: no service worker support, no
 * VAPID key configured, or a non-secure origin. A dead toggle that silently
 * fails is worse than no toggle, because it looks like it is armed.
 */

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * The subscribe API wants a Uint8Array, and VAPID keys travel as base64url.
 * Neither `atob` nor the key format tolerates the other's padding, hence the
 * two rewrites before decoding.
 *
 * Backed by an explicitly-constructed ArrayBuffer, and the return type is
 * left to inference. `new Uint8Array(length)` infers the wider
 * Uint8Array<ArrayBufferLike>, which no longer satisfies BufferSource — it
 * might be a SharedArrayBuffer, and applicationServerKey may not be.
 */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

type State = "unsupported" | "idle" | "busy" | "on" | "denied";

export function PushToggle() {
  /*
   * null means "not yet determined", and renders nothing.
   *
   * Support cannot be read during render — `navigator.serviceWorker` does not
   * exist on the server, and guessing would either break hydration or flash
   * an armed-looking bell on a browser that cannot deliver. One frame of
   * nothing is the honest state, and the toolbar has no layout to shift.
   */
  const [state, setState] = useState<State | null>(null);
  const subscribe = useMutation(api.notify.subscribePush);
  const unsubscribe = useMutation(api.notify.unsubscribePush);

  useEffect(() => {
    let cancelled = false;

    const resolve = async (): Promise<State> => {
      if (
        !VAPID ||
        !isConvexConfigured ||
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        return "unsupported";
      }

      if (Notification.permission === "denied") return "denied";

      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        return sub ? "on" : "idle";
      } catch {
        // No worker registered yet. That is the normal first-load state.
        return "idle";
      }
    };

    /*
     * The write happens in the callback, never in the effect body.
     *
     * A setState written synchronously here cascades an extra render before
     * paint. Even the branches above that need no I/O settle in a microtask,
     * so this is always deferred — same discipline as useNow in ExpressAdmin,
     * which schedules its first tick rather than writing one.
     */
    void resolve().then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      // `register` resolves before the worker is active; subscribing against
      // an installing worker throws.
      await navigator.serviceWorker.ready;

      const sub = await registration.pushManager.subscribe({
        // Required by every browser now — a subscription without it is
        // rejected outright rather than silently delivering nothing.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!),
      });

      const json = sub.toJSON();
      if (!json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Subscription is missing its keys.");
      }

      await subscribe({
        endpoint: sub.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });

      setState("on");
    } catch {
      setState("idle");
    }
  }, [subscribe]);

  const disable = useCallback(async () => {
    setState("busy");
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        /*
         * Server row first, then the browser subscription.
         *
         * The other order can leave a row pointing at an endpoint that no
         * longer exists — harmless, but it means every future alert spends a
         * request discovering that. This way a failure partway leaves the
         * device subscribed and reachable, which is the safer half.
         */
        await unsubscribe({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("on");
    }
  }, [unsubscribe]);

  if (state === null || state === "unsupported") return null;

  if (state === "denied") {
    return (
      <span
        className="admin-meta hidden md:inline"
        title="Notifications are blocked for this site in your browser settings."
      >
        Push blocked
      </span>
    );
  }

  const on = state === "on";

  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={() => void (on ? disable() : enable())}
      aria-pressed={on}
      title={
        on
          ? "Alerts are on for this device"
          : "Get outage alerts on this device"
      }
      aria-label={
        on
          ? "Turn off push alerts on this device"
          : "Turn on push alerts on this device"
      }
      className={`hairline hidden rounded-lg p-1.5 transition-colors duration-fast disabled:opacity-50 md:block ${
        on ? "bg-surface-2 text-primary" : "text-secondary hover:text-primary"
      }`}
    >
      {on ? <BellOn /> : <BellOff />}
    </button>
  );
}

/* Inline, stroke-only, currentColor — the admin uses no icon library. */

function BellOn() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6.5a4 4 0 1 1 8 0c0 2.5.8 3.6 1.2 4H2.8C3.2 10.1 4 9 4 6.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 13a1.6 1.6 0 0 0 3 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BellOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6.5a4 4 0 1 1 8 0c0 2.5.8 3.6 1.2 4H2.8C3.2 10.1 4 9 4 6.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 13a1.6 1.6 0 0 0 3 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M2.5 2.5l11 11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
