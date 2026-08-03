"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { activeBlurCount, blurCandidateCount } from "@/lib/blur-budget";
import { activeScrubCount } from "@/lib/scrub-budget";
import { MAX_LIVE_CONTEXTS, liveContextCount } from "@/lib/webgl-budget";
import {
  MAX_BLURRED_IN_VIEWPORT,
  MAX_SCRUBBED_SEQUENCES,
} from "@/lib/capability";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * MotionDebug — the instrument panel for everything in this system.
 *
 * Toggled with ?debug=motion. Development only: the production branch returns
 * null before any hook that costs anything, and the whole component is dropped
 * by dead-code elimination in a production build.
 *
 * Reads its own rAF rather than the sampler's, because the sampler
 * deliberately discards windows and warm-up frames — useful for a verdict,
 * useless for watching. This one shows the raw truth.
 */
/* The query param never changes without a navigation, so this is a constant
   subscription — read once on the client, always false on the server so the
   overlay is absent from the SSR payload and hydration agrees. */
const noopSubscribe = () => () => {};
const readDebugFlag = () =>
  new URLSearchParams(window.location.search).get("debug") === "motion";

export function MotionDebug() {
  const capability = useCapability();
  const enabled = useSyncExternalStore(noopSubscribe, readDebugFlag, () => false);
  const [fps, setFps] = useState(0);
  const [counts, setCounts] = useState({
    blur: 0,
    candidates: 0,
    scrub: 0,
    gl: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let frames = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frames += 1;
      if (now - last < 500) return;
      setFps(Math.round((frames * 1000) / (now - last)));
      setCounts({
        blur: activeBlurCount(),
        candidates: blurCandidateCount(),
        scrub: activeScrubCount(),
        gl: liveContextCount(),
      });
      frames = 0;
      last = now;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  if (process.env.NODE_ENV === "production" || !enabled) return null;

  const overBudget = counts.blur > capability.maxBlurredElements;

  return (
    <div
      // Deliberately not glass — an instrument that costs what it measures is
      // useless.
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(0,0,0,0.88)",
        border: "1px solid rgba(255,255,255,0.16)",
        color: "#f7f8f8",
        font: "500 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace",
        pointerEvents: "none",
        whiteSpace: "pre",
      }}
    >
      <Row label="tier" value={capability.tier} />
      <Row
        label="fps"
        value={String(fps)}
        tone={fps < 30 ? "bad" : fps < 50 ? "warn" : "ok"}
      />
      <Row
        label="blurred"
        value={`${counts.blur}/${capability.maxBlurredElements} (${counts.candidates} cand)`}
        tone={overBudget ? "bad" : "ok"}
      />
      <Row
        label="scrub"
        value={`${counts.scrub}/${MAX_SCRUBBED_SEQUENCES}`}
        tone={counts.scrub > MAX_SCRUBBED_SEQUENCES ? "bad" : "ok"}
      />
      <Row
        label="webgl"
        value={`${counts.gl}/${MAX_LIVE_CONTEXTS}`}
        tone={counts.gl > MAX_LIVE_CONTEXTS ? "bad" : "ok"}
      />
      <Row label="hover" value={capability.canHover ? "yes" : "no"} />
      <Row
        label="flags"
        value={[
          capability.canBlur ? "blur" : null,
          capability.canScrub ? "scrub" : null,
          capability.can3D ? "3d" : null,
        ]
          .filter(Boolean)
          .join(" ") || "none"}
      />
      <Row label="maxBlur" value={`${capability.maxBlurPx}px`} />
      <div style={{ opacity: 0.4, marginTop: 4 }}>
        cap {MAX_BLURRED_IN_VIEWPORT} blur · {MAX_SCRUBBED_SEQUENCES} scrub
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const colour =
    tone === "bad" ? "#e5484d" : tone === "warn" ? "#dba463" : "#3fb950";
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span style={{ color: tone === "ok" ? "#f7f8f8" : colour }}>{value}</span>
    </div>
  );
}
