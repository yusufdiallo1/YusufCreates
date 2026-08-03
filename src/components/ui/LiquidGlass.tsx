"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Feature detection

   SVG-filter-as-backdrop-filter (`backdrop-filter: url(#id)`) is Chromium-only.
   Safari and Firefox parse the url() but render nothing through it, which would
   silently blank the backdrop — so we must detect rather than assume.

   CSS.supports() returns true in browsers that accept the syntax but don't
   implement the effect, so it is not sufficient on its own. We pair it with a
   Chromium engine check: Safari exposes GPUShaderStage-less WebKit and Firefox
   fails the supports() test outright.
   --------------------------------------------------------------------------- */

function detectSvgBackdropSupport(): boolean {
  if (typeof window === "undefined" || typeof CSS === "undefined") return false;

  const syntaxOk =
    CSS.supports("backdrop-filter", "url(#test)") ||
    CSS.supports("-webkit-backdrop-filter", "url(#test)");
  if (!syntaxOk) return false;

  // Chromium exposes window.chrome; Safari does not. Exclude Safari explicitly
  // since WebKit accepts the syntax but renders the backdrop as empty.
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  return !isSafari;
}

/* The result never changes for the lifetime of the document, so the store is a
   constant subscription and the value is computed once and memoised. */
let cachedSupport: boolean | null = null;
const noopSubscribe = () => () => {};

/** True only where `backdrop-filter: url(#…)` actually refracts. */
export function useSvgBackdropSupport(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    // Client: detect once, then serve from cache.
    () => (cachedSupport ??= detectSvgBackdropSupport()),
    // Server: always the safe path, so SSR matches first client paint.
    () => false,
  );
}

/* ---------------------------------------------------------------------------
   Blur budget

   Each backdrop-filtered element forces the compositor to snapshot and blur the
   region behind it. Past a handful on screen this drops frames badly on
   integrated GPUs, so we cap how many instances get the real blur; the rest
   fall back to an opaque surface that looks identical in stillness.
   --------------------------------------------------------------------------- */

/* Four is the budget for a screen: three hero slabs plus the nav. Past that,
   instances fall back to an opaque surface that looks identical in stillness
   and costs nothing to composite. */
const MAX_BLURRED = 4;
let activeBlurCount = 0;

/**
 * How big a refracted panel may be, in square pixels.
 *
 * Counting instances was not enough. The cost of a backdrop filter is the
 * AREA it re-samples, and the budget was being spent on the largest elements
 * on the page — panels of 80,000 to 160,000 px² that scroll, so the whole
 * region is re-blurred every frame. Measured on this page: refraction on
 * those cost 11fps, and dropping the filter from everything that scrolls took
 * a 40fps scroll to 57.
 *
 * Small fixed furniture — the chat pill, the promo card — is cheap at any
 * radius because the compositor can cache it. This threshold keeps the effect
 * exactly where it is affordable and drops it where it is not.
 */
const MAX_REFRACT_AREA = 40_000;

function useBlurBudget(): boolean {
  // Claimed in an effect so mount order decides who gets the budget, but the
  // claim is recorded in a ref and surfaced via a single state flip — never a
  // synchronous setState in the effect body.
  const claimed = useRef(false);
  const [withinBudget, setWithinBudget] = useState(false);

  useEffect(() => {
    if (claimed.current || activeBlurCount >= MAX_BLURRED) return;
    activeBlurCount += 1;
    claimed.current = true;

    // Deferred to a microtask: keeps the state update out of the effect body,
    // so it batches into the next commit instead of cascading this one.
    const id = requestAnimationFrame(() => setWithinBudget(true));

    return () => {
      cancelAnimationFrame(id);
      if (claimed.current) {
        activeBlurCount -= 1;
        claimed.current = false;
      }
    };
  }, []);

  return withinBudget;
}

/* ------------------------------------------------------------------------- */

/**
 * Depth, not intensity. How near the panel reads is the only thing a caller
 * chooses; blur, transparency, shadow length and light-catch strength all
 * follow from it, defined together in globals.css so the three levels stay a
 * coherent gradient rather than three independent knobs.
 */
type Depth = "near" | "mid" | "far";
type Shape = "panel" | "card" | "pill";

const DEPTH_CLASS: Record<Depth, string> = {
  near: "glass-near",
  mid: "glass-mid",
  far: "glass-far",
};

const SHAPE_CLASS: Record<Shape, string> = {
  panel: "glass-panel p-8",
  card: "glass-card p-6",
  pill: "glass-pill px-6 py-2",
};

/** Refraction strength per depth. Nearer glass bends light more. */
const REFRACTION: Record<
  Depth,
  { blur: number; displacement: number; frequency: number }
> = {
  near: { blur: 28, displacement: 18, frequency: 0.006 },
  mid: { blur: 20, displacement: 12, frequency: 0.008 },
  far: { blur: 14, displacement: 7, frequency: 0.011 },
};

export interface LiquidGlassProps
  extends React.HTMLAttributes<HTMLDivElement> {
  depth?: Depth;
  shape?: Shape;
  /** Opt out of refraction even on Chromium (e.g. over busy imagery). */
  refract?: boolean;
  children?: React.ReactNode;
}

export function LiquidGlass({
  depth = "mid",
  shape = "panel",
  refract = true,
  className,
  children,
  style,
  ...props
}: LiquidGlassProps) {
  const filterId = useId().replace(/:/g, "");
  const svgSupported = useSvgBackdropSupport();
  const withinBudget = useBlurBudget();

  /*
   * Refraction is for small panels only — see MAX_REFRACT_AREA.
   *
   * Measured after mount rather than guessed from props, because the size
   * that matters is the laid-out one: the same component is a 6,000px² pill
   * in the corner and a 160,000px² card in a grid, and only the second is
   * expensive.
   *
   * Starts false so the server and the first client render agree; a panel
   * that qualifies gains refraction on the next frame, which is invisible
   * against an effect that is itself a subtle distortion.
   */
  const hostRef = useRef<HTMLDivElement>(null);
  const [smallEnough, setSmallEnough] = useState(false);
  /*
   * True for a panel that is both large AND scrolls, which is the expensive
   * combination — see .glass-static. A fixed element is cheap however big it
   * is, because nothing behind it moves and the compositor caches the blur.
   */
  const [dropBlur, setDropBlur] = useState(false);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      const area = width * height;
      const fixed = getComputedStyle(node).position === "fixed";

      setSmallEnough(area <= MAX_REFRACT_AREA);
      setDropBlur(!fixed && area > MAX_REFRACT_AREA);
    };
    measure();

    // Re-checked on resize: a panel that is narrow on a phone can cross the
    // threshold when the same page is opened on a desktop.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { blur, displacement, frequency } = REFRACTION[depth];
  // Progressive enhancement only: Safari and Firefox get blur plus shadow and
  // must still look complete, which they do — the specular inset and the
  // shadow stack carry the material on their own.
  const useRefraction = refract && svgSupported && withinBudget && smallEnough;

  // Only set when refracting. Otherwise the depth class in globals.css owns
  // backdrop-filter entirely, which keeps the mobile blur reduction and the
  // reduced-transparency override in one place instead of being overridden by
  // an inline style.
  const backdrop = useRefraction ? `url(#${filterId})` : undefined;

  return (
    <>
      {useRefraction ? (
        <svg aria-hidden="true" className="absolute size-0">
          <defs>
            <filter
              id={filterId}
              // Sample beyond the element bounds so edges refract rather than
              // clamping against transparent pixels.
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency={frequency}
                numOctaves={2}
                seed={4}
                result="noise"
              />
              {/* Soften the noise so displacement reads as a lens, not grain. */}
              <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="softNoise"
                scale={displacement}
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              {/* The blur the CSS path would otherwise apply. */}
              <feGaussianBlur in="displaced" stdDeviation={blur / 4} />
            </filter>
          </defs>
        </svg>
      ) : null}

      <div
        ref={hostRef}
        data-depth={depth}
        data-shape={shape}
        data-refracting={useRefraction ? "true" : undefined}
        className={cn(
          "glass-depth",
          DEPTH_CLASS[depth],
          SHAPE_CLASS[shape],
          // Applied after the depth class so it wins the backdrop-filter it
          // is there to cancel.
          dropBlur && "glass-static",
          className,
        )}
        style={
          {
            ...(backdrop
              ? { backdropFilter: backdrop, WebkitBackdropFilter: backdrop }
              : {}),
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </>
  );
}
