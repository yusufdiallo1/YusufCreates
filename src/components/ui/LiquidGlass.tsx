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

const MAX_BLURRED = 6;
let activeBlurCount = 0;

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

type Variant = "panel" | "card" | "pill";
type Intensity = "subtle" | "medium" | "strong";

const VARIANT_CLASS: Record<Variant, string> = {
  panel: "rounded-2xl p-8",
  card: "rounded-xl p-6",
  pill: "rounded-full px-6 py-2",
};

/**
 * Blur and displacement scale per intensity. Blur multiplies --glass-blur so
 * the token stays the single source of truth.
 */
const INTENSITY: Record<
  Intensity,
  { blur: number; displacement: number; frequency: number }
> = {
  subtle: { blur: 0.6, displacement: 6, frequency: 0.012 },
  medium: { blur: 1, displacement: 12, frequency: 0.008 },
  strong: { blur: 1.6, displacement: 20, frequency: 0.005 },
};

export interface LiquidGlassProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  intensity?: Intensity;
  /** Opt out of refraction even on Chromium (e.g. over busy imagery). */
  refract?: boolean;
  children?: React.ReactNode;
}

export function LiquidGlass({
  variant = "panel",
  intensity = "medium",
  refract = true,
  className,
  children,
  style,
  ...props
}: LiquidGlassProps) {
  const filterId = useId().replace(/:/g, "");
  const svgSupported = useSvgBackdropSupport();
  const withinBudget = useBlurBudget();

  const { blur, displacement, frequency } = INTENSITY[intensity];
  const useRefraction = refract && svgSupported && withinBudget;

  // Layer 1 (base) + layer 3 (refraction). The SVG filter replaces the blur
  // function entirely on Chromium, so the filter itself carries a feGaussianBlur.
  const backdrop = useRefraction
    ? `url(#${filterId})`
    : `blur(calc(var(--glass-blur) * ${blur})) saturate(var(--glass-saturate))`;

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
              <feGaussianBlur in="displaced" stdDeviation={6 * blur} />
            </filter>
          </defs>
        </svg>
      ) : null}

      <div
        data-variant={variant}
        data-intensity={intensity}
        data-refracting={useRefraction ? "true" : undefined}
        className={cn("liquid-glass", VARIANT_CLASS[variant], className)}
        style={
          {
            "--lg-backdrop": backdrop,
            "--lg-blur-scale": blur,
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
