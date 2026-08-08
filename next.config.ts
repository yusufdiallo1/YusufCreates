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
  // Video embeds are framed, so their hosts belong here — without them a
  // pasted YouTube link renders an empty box and the only clue is a console
  // warning nobody is looking at. nocookie is the domain the player uses.
  "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://www.instagram.com",
  // Uploaded video is served from Convex storage and played, not framed.
  "media-src 'self' https://*.convex.cloud blob:",
  /*
   * The push service worker at /sw.js.
   *
   * Stated explicitly rather than left to fall through child-src to
   * default-src. It would work either way today, but this policy is
   * report-only and will eventually be enforced — and a service worker that
   * silently fails to register takes the outage alerts with it, which is the
   * one failure nobody would notice until it mattered.
   */
  "worker-src 'self'",
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

  experimental: {
    /*
     * React's <ViewTransition>, which matches elements across a navigation by
     * name and animates between their positions itself. A project card
     * becoming a case study hero is one object moving rather than two things
     * swapping.
     *
     * Without this flag the component is inert, not broken — the App Router
     * navigates normally and nothing animates. Same on a browser without the
     * View Transitions API.
     */
    viewTransition: true,
  },

  /*
   * Uploaded covers and avatars live in Convex file storage, which serves them
   * from the deployment host. next/image refuses any remote host it has not
   * been told about, so without this every uploaded image 400s at the
   * optimizer and renders as a broken icon.
   *
   * The subdomain is wildcarded because the deployment name differs between
   * dev and prod — pinning the literal host would work in one and silently
   * break the other. `pathname` is scoped to the storage route so this does
   * not become a general-purpose proxy for anything else on the host.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
        pathname: "/api/storage/**",
      },
    ],
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
