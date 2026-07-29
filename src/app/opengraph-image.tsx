import { ImageResponse } from "next/og";

/**
 * Social share card.
 *
 * Generated rather than a static file so it always matches the site's palette,
 * and so there is no PNG to re-export whenever the wording changes.
 *
 * Without this, scrapers pick the first plausible image on the page — which
 * meant a DocuTrackr project screenshot was representing the whole site in
 * iMessage and on every social platform.
 *
 * Deliberately typographic. A screenshot at 1200x630 is unreadable in a chat
 * bubble; a name and one line of positioning survive the scale.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Yusuf Creates — websites and web apps, built properly";

// Hex, not var(): the OG renderer has no stylesheet and var() resolves to
// nothing, which would silently render black on black.
const CANVAS = "#08090a";
const PRIMARY = "#f7f8f8";
const SECONDARY = "#8a8f98";
const ACCENT = "#5e6ad2";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: CANVAS,
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Single soft accent wash, upper right — the same light source the
            site uses, so the card reads as part of the same object. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -160,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background: `radial-gradient(circle, rgba(94,106,210,0.22) 0%, rgba(94,106,210,0) 70%)`,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* The real mark, not a placeholder dot. Geometry mirrors
              src/components/ui/Logo.tsx — if that changes, change this too.
              Inlined because the OG renderer cannot import a component that
              uses motion, and cannot fetch an asset over the network. */}
          <svg width={56} height={56} viewBox="0 0 220 220">
            <path
              d="M61 48 L92 79 L61 110"
              fill="none"
              stroke={PRIMARY}
              strokeWidth={15}
              strokeLinecap="square"
            />
            <path
              d="M159 48 L115 92 L115 137"
              fill="none"
              stroke={PRIMARY}
              strokeWidth={15}
              strokeLinecap="square"
            />
            <rect x={99} y={155} width={34} height={17} fill={ACCENT} />
          </svg>

          <div style={{ fontSize: 26, color: SECONDARY, letterSpacing: "0.02em" }}>
            yusufcreates.com
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 600,
              color: PRIMARY,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Websites and web apps,</span>
            {/* A flex row with an explicit gap, not `built{" "}`: the OG
                renderer collapses that whitespace expression and the two words
                render touching. */}
            <span style={{ display: "flex", gap: 22 }}>
              <span>built</span>
              <span style={{ color: ACCENT }}>properly.</span>
            </span>
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              color: SECONDARY,
              lineHeight: 1.4,
              maxWidth: 820,
            }}
          >
            Design and build for founders and teams who need it to work, not
            just look finished.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 24, color: PRIMARY }}>Yusuf Diallo</div>
          <div style={{ fontSize: 24, color: SECONDARY }}>·</div>
          <div style={{ fontSize: 24, color: SECONDARY }}>
            Next.js · TypeScript · Convex
          </div>
        </div>
      </div>
    ),
    size,
  );
}
