import "server-only";
import webpush from "web-push";

/**
 * Web push, for me and nobody else.
 *
 * `server-only` for the same reason as src/lib/email.ts: VAPID_PRIVATE_KEY
 * signs every message and must never be reachable from a client component.
 * The PUBLIC key is separately exposed as NEXT_PUBLIC_VAPID_PUBLIC_KEY, which
 * is correct — the browser needs it to subscribe, and it is public by design.
 *
 * This exists because email is where I look when I am already looking. A site
 * that goes down at 3am needs something that makes me look.
 *
 * Never offered to clients. A client wants a considered message explaining
 * what happened and what is being done about it, which is the 15-minute email
 * — not a phone buzz at 3am about a blip that resolved before they woke up.
 */

let configured: boolean | null = null;

function ready(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }

  /*
   * The subject must be a mailto: or https: URL — the push service rejects
   * anything else, and it does so at send time with an opaque 400. Defaulted
   * rather than required so a missing variable degrades to "pushes still
   * work" instead of "nothing sends".
   */
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@yusufcreates.com",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Where the notification click lands. Relative to the site root. */
  url?: string;
  /**
   * Collapse key. Two alerts about the same site replace one another rather
   * than stacking, so a flapping check does not bury the lock screen.
   */
  tag?: string;
};

export type PushResult = {
  sent: number;
  /** Endpoints the push service says are permanently gone. Caller prunes them. */
  gone: string[];
};

export async function sendPush(
  subscriptions: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
): Promise<PushResult> {
  if (!ready() || subscriptions.length === 0) {
    return { sent: 0, gone: [] };
  }

  const body = JSON.stringify(payload);
  const gone: string[] = [];
  let sent = 0;

  /*
   * Sequential, not Promise.all. This is a handful of my own devices, and a
   * fan-out buys nothing measurable while making the 404/410 bookkeeping
   * harder to follow.
   */
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 60 * 60 },
      );
      sent += 1;
    } catch (err) {
      /*
       * 404 and 410 are the only permanent failures. Everything else — a 429,
       * a 500 from the push service, a network blip — is transient, and
       * deleting a subscription over one would silently stop alerting the
       * device that a temporary outage happened to touch.
       */
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(sub.endpoint);
    }
  }

  return { sent, gone };
}

/** Whether push is configured at all, for the admin toggle's disabled state. */
export function isPushConfigured(): boolean {
  return ready();
}
