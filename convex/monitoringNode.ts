"use node";

import { v } from "convex/values";
import tls from "node:tls";
import { internalAction } from "./_generated/server";

/**
 * TLS certificate expiry.
 *
 * `"use node"` because reading a certificate needs a real TLS socket, which
 * Convex's default runtime does not provide. A "use node" module may contain
 * only actions, which is why this holds nothing but the one probe and
 * convex/monitoring.ts holds everything else.
 *
 * There is no HTTP way to do this. `fetch` completes the handshake and then
 * throws the certificate away — by the time a response exists, the thing we
 * wanted to inspect is gone.
 *
 * Why it is worth the separate file: an expired certificate shows every
 * visitor a full-page browser warning saying the site is unsafe. Most renew
 * themselves and this reports nothing interesting for months — and then one
 * does not, on a Saturday, and the client's customers see an interstitial.
 */

/** A handshake against a healthy host is fast; this is for the ones that are not. */
const HANDSHAKE_TIMEOUT_MS = 10_000;

export const certificateExpiry = internalAction({
  args: { hostname: v.string() },
  handler: async (_ctx, args): Promise<number | null> => {
    return await new Promise<number | null>((resolve) => {
      let settled = false;
      const finish = (value: number | null) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(value);
      };

      const socket = tls.connect(
        {
          host: args.hostname,
          port: 443,
          servername: args.hostname,
          /*
           * Certificates are READ, not trusted.
           *
           * With rejectUnauthorized left on, an already-expired certificate
           * aborts the handshake — so the one case this exists to catch would
           * report null and send no warning at all. Nothing here consumes the
           * response body, so accepting the connection grants nothing: the
           * only thing taken from it is the notAfter date.
           */
          rejectUnauthorized: false,
        },
        () => {
          const cert = socket.getPeerCertificate();

          if (!cert || !cert.valid_to) {
            finish(null);
            return;
          }

          const ts = Date.parse(cert.valid_to);
          finish(Number.isFinite(ts) ? ts : null);
        },
      );

      socket.setTimeout(HANDSHAKE_TIMEOUT_MS, () => finish(null));

      // DNS failure, connection refused, or a host not speaking TLS at all.
      // All of them mean "unknown", which must never be mistaken for expired.
      socket.on("error", () => finish(null));
    });
  },
});
