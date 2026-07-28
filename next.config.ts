import type { NextConfig } from "next";

/**
 * Content Security Policy — REPORT ONLY, deliberately.
 *
 * An enforced CSP shipped blind will break something invisible: the Convex
 * websocket, Stripe's hosted fields, the Turnstile iframe, or next-themes'
 * inline anti-flash script. You would find out from a client who could not
 * pay, not from a test.
 *
 * So this reports first. Run it across every flow — a payment, a form
 * submission, the admin, the chat — check what would have been blocked, then
 * switch the header name to `Content-Security-Policy` to enforce.
 *
 * Known inline requirements in this codebase, which is why 'unsafe-inline'
 * is present and cannot simply be dropped:
 *   - JSON-LD via dangerouslySetInnerHTML on the marketing pages
 *   - SlideToConfirm injects a <style> tag for its shimmer keyframes
 *   - next/font injects inline style
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required by the inline scripts listed above. Removing
  // it needs a nonce, which in turn forces every page to render dynamically.
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // wss:// matters as much as https:// — Convex holds an open websocket, and
  // omitting the scheme silently breaks every live query.
  "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://api.stripe.com https://api.anthropic.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Pin the workspace root — a lockfile higher up the tree would otherwise be
  // inferred as the root.
  turbopack: {
    root: __dirname,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: csp },
          // Deliberately without `preload`. Preloading is submitted to a
          // browser-maintained list and is effectively irreversible for about
          // a year — add it only once every subdomain is certainly HTTPS-only.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
