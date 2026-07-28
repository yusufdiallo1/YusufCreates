# YusufCreates — Claude Code Build Prompts

Run in order. One paste per prompt. Verify before moving on.

**Repo:** `https://github.com/yusufdiallo1/YusufCreates.git`
**Domain:** yusufcreates.com — registered at Namecheap, hosted on Vercel

**Two supplied files** — copy these in before Prompt 2:

```
Logo.tsx            -> src/components/ui/Logo.tsx
SlideToConfirm.tsx  -> src/components/ui/SlideToConfirm.tsx
```

The full source of both is also embedded in Prompt 2 and Prompt 3 below, so Claude Code can regenerate them if the files go missing.

---

## Confirmed stack

| Layer | Choice |
|---|---|
| Framework | Next.js, App Router, TypeScript |
| Styling | Tailwind CSS |
| Animation | Motion (motion.dev) |
| Database and backend | Convex |
| Admin auth | Convex Auth, GitHub OAuth, single allowed account |
| Email | Resend + React Email |
| Payments | Stripe |
| AI assistant | Anthropic API, Claude Haiku |
| Spam protection | Cloudflare Turnstile + slide gesture signals |
| Hosting | Vercel |
| Registrar and DNS | Namecheap |

---

## Install

```bash
npx create-next-app@latest yusufcreates --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd yusufcreates

npm i motion lenis @number-flow/react clsx tailwind-merge class-variance-authority \
  @fontsource-variable/inter @radix-ui/react-accordion @radix-ui/react-dialog \
  @radix-ui/react-slider @radix-ui/react-tooltip @radix-ui/react-dropdown-menu \
  @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-label \
  @radix-ui/react-scroll-area cmdk sonner vaul lucide-react iconsax-react \
  react-hook-form zod @hookform/resolvers @marsidev/react-turnstile convex \
  @convex-dev/auth resend @react-email/components stripe @stripe/stripe-js \
  @anthropic-ai/sdk recharts next-themes usehooks-ts react-wrap-balancer date-fns

npm i -D tailwindcss-animate @tailwindcss/typography

npx convex dev
```

What the less obvious ones are for: `lenis` is smooth scroll, which is what makes the
parallax feel weighted rather than jittery. `@number-flow/react` animates digits, needed
for the currency toggle and page-count slider. `cmdk` is the command palette, `sonner`
toasts, `vaul` the mobile drawer. `@marsidev/react-turnstile` wraps Cloudflare Turnstile.
OG image generation is built into `next/og`, so no separate package.

---

## Where the slide control appears

Only on actions that cannot be cleanly undone. Anywhere else it becomes an annoying gimmick.

| Location | Purpose prop | Label |
|---|---|---|
| Final step of the lead form | `submit-lead` | Slide to send |
| Enterprise tier CTA | `submit-lead` | Slide to request a proposal |
| Deposit checkout handoff | `to-payment` | Slide to continue to payment |
| Care Plan signup | `start-subscription` | Slide to start your Care Plan |
| Broadcast send | `send-broadcast` | Slide to send to N people |
| Destructive deletes in admin | `delete` | Slide to delete |

Ordinary buttons stay ordinary buttons: nav links, step advance in the form, filters, saves, cancels.

---

## Prompt 0 — Scaffold and repo

```
Set up a new Next.js project called YusufCreates in this directory.

Requirements:
- Next.js with the App Router, TypeScript, Tailwind CSS, ESLint
- src/ directory, path alias @/*
- Check the current stable Next.js version before installing rather than assuming
- Install and initialise Convex
- Install: motion, @convex-dev/auth, resend, @react-email/components, stripe, @anthropic-ai/sdk, cmdk
- Folder structure:
    src/app/(marketing)   public pages
    src/app/(admin)       dashboard, auth-gated
    src/app/api           route handlers
    src/components/ui     primitives
    src/components/marketing
    src/components/admin
    src/components/motion
    src/lib               utils, constants, pricing logic
    convex/               schema and functions
    emails/               React Email templates
- Create .env.local.example listing every env var with a comment explaining each. No real secrets anywhere.
- .gitignore excluding .env.local, .convex, node_modules, .next
- Initialise git, first commit, add remote https://github.com/yusufdiallo1/YusufCreates.git, push to main

Then write README.md with setup steps, the env var list, and a short architecture overview.
```

---

## Prompt 1 — Design tokens and base styles

```
Set up the design system. The direction is Apple Liquid Glass over a Linear-style near-black canvas. Premium, restrained, precise. No neon, no heavy gradients, no glow.

Create src/app/globals.css with CSS custom properties.

Colour, dark mode default:
  --bg-canvas: #08090a
  --bg-surface-1: #0f1011
  --bg-surface-2: #161718
  --bg-surface-3: #23252a
  --text-primary: #f7f8f8
  --text-secondary: #8a8f98
  --border-hairline: rgba(255,255,255,0.08)
  --border-glass: rgba(255,255,255,0.13)
  --accent: #5e6ad2
  --accent-glow: rgba(94,106,210,0.35)
  --danger: #e5484d

Light mode under [data-theme="light"]:
  --bg-canvas: #fbfbfd
  --text-primary: #0a0a0a
  Derive the rest sensibly.

Typography — font stack, important:
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter Variable", Inter, system-ui, sans-serif

  This resolves to SF Pro on Apple devices using the copy already installed on the
  operating system, and falls back to Inter everywhere else. Do NOT self-host SF Pro
  or serve it as a webfont — Apple's licence does not permit that on a public website.
  Self-host Inter Variable via next/font as the fallback.

  OpenType features cv01 and ss03 on the Inter fallback
  Weight range 300 to 600
  Display tracking -0.022em
  Scale: 12, 14, 16, 18, 20, 24, 32, 48, 64
  Display sizes use clamp() so they scale with viewport

Spacing, 8pt based: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
Radius: 8, 12, 16, 24, 28, 9999

Glass:
  --glass-bg: rgba(14,14,22,0.24)
  --glass-blur: 12px
  --glass-saturate: 180%
  --glass-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -8px 20px rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.13)

Motion:
  --dur-fast: 0.2s
  --dur-base: 0.4s
  --dur-slow: 0.8s
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)

Wire all of these into the Tailwind config as utility classes.

Accessibility, non-negotiable:
  prefers-reduced-transparency: reduce  removes backdrop-filter, uses an opaque background
  prefers-reduced-motion: reduce        disables parallax, marquees and the custom cursor
  prefers-contrast: more                strengthens borders and text contrast
  Visible keyboard focus rings everywhere. Never outline: none without a replacement.

Depth comes from the surface ladder and hairline borders, not drop shadows.
```

---

## Prompt 2 — Liquid glass and the logo

```
The logo component already exists at src/components/ui/Logo.tsx. Read it, do not rewrite it.

It renders a Y mark built as a terminal prompt: a chevron left arm, a right arm folding
into the stem as one continuous stroke, and an accent cursor block below. All angles are
45 or 90 degrees, stroke width 15, square caps, mitred joins. The gap between the chevron
tip and the arm is deliberate — one stroke width — and must be preserved.

The wordmark is two-tone: "Yusuf" at weight 400 in the primary text colour, "Creates" at
weight 600 in the accent colour, set in the SF Pro font stack.

If the file is missing, recreate it from this source:

---8<--- src/components/ui/Logo.tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter Variable", Inter, system-ui, sans-serif';

type LogoProps = {
  variant?: "lockup" | "mark";
  monochrome?: boolean;
  animated?: boolean;
  primaryColor?: string;
  accentColor?: string;
  className?: string;
};

const STROKE = 15;
const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";
const SESSION_KEY = "yc-logo-played";

export function Logo({
  variant = "lockup",
  monochrome = false,
  animated = false,
  primaryColor = "var(--text-primary, #f7f8f8)",
  accentColor = "var(--accent, #5e6ad2)",
  className,
}: LogoProps) {
  const reduceMotion = useReducedMotion();
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (!animated || reduceMotion) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setShouldPlay(true);
  }, [animated, reduceMotion]);

  const strokeColor = monochrome ? "currentColor" : primaryColor;
  const blockColor = monochrome ? "currentColor" : accentColor;
  const yusufColor = monochrome ? "currentColor" : primaryColor;
  const createsColor = monochrome ? "currentColor" : accentColor;

  const strokeProps = {
    fill: "none",
    stroke: strokeColor,
    strokeWidth: STROKE,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };

  const mark = (
    <>
      <motion.path
        d={CHEVRON}
        {...strokeProps}
        initial={shouldPlay ? { pathLength: 0 } : false}
        animate={shouldPlay ? { pathLength: 1 } : undefined}
        transition={{ duration: 0.4, delay: 1.06, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.path
        d={ARM}
        {...strokeProps}
        initial={shouldPlay ? { pathLength: 0 } : false}
        animate={shouldPlay ? { pathLength: 1 } : undefined}
        transition={{ duration: 0.4, delay: 1.16, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.rect
        x={99}
        y={155}
        width={34}
        height={17}
        fill={blockColor}
        initial={shouldPlay ? { opacity: 1 } : false}
        animate={shouldPlay ? { opacity: [1, 0, 1, 0, 1] } : undefined}
        transition={{ duration: 1.06, times: [0, 0.25, 0.5, 0.75, 1] }}
      />
    </>
  );

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 220 220" className={className} role="img" aria-label="YusufCreates">
        <title>YusufCreates</title>
        {mark}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 56" className={className} role="img" aria-label="YusufCreates">
      <title>YusufCreates</title>
      <g transform="translate(-16.3, -4.3) scale(0.304)">{mark}</g>
      <text x={52} y={38} fontSize={28} letterSpacing="-0.022em" style={{ fontFamily: FONT_STACK }}>
        <tspan fontWeight={400} fill={yusufColor}>Yusuf</tspan>
        <tspan fontWeight={600} fill={createsColor}>Creates</tspan>
      </text>
    </svg>
  );
}
---8<---

Wire it into the app:
- Generate public/favicon.svg from the mark on a 24 grid with a heavier stroke so it
  survives 16px, and register it plus the Apple touch icon in the metadata config
- The lockup in the nav, the mark alone in the footer and on small screens
- The animated variant on the homepage only
- Export a static logo.svg with the wordmark converted to outlines, for PDFs and invoices
  where no font can be relied on

Now build src/components/ui/LiquidGlass.tsx.

Layered approach:
1. Base: background var(--glass-bg) with backdrop-filter blur(var(--glass-blur)) saturate(var(--glass-saturate)), including the -webkit- prefix
2. Specular edges: the --glass-shadow token, combining an outer drop shadow, a top inset highlight, a bottom inset scatter and a 1px inset border
3. Refraction: an SVG feDisplacementMap filter applied through backdrop-filter: url(#...)

Critical: SVG-filter-as-backdrop-filter works only in Chromium. Feature-detect it. Safari
and Firefox fall back to blur plus specular and must still look good. Refraction is never
load-bearing.

Props: variant ('panel' | 'card' | 'pill'), intensity ('subtle' | 'medium' | 'strong'), className, children.

Performance: cap simultaneously blurred elements, reduce blur radius under @media (hover: none), never animate a blurred layer's size or position.
```

---

## Prompt 3 — Cursor, motion primitives, slide control

```
Build the interaction layer. These details are what make the site feel expensive.

src/components/ui/CustomCursor.tsx
- Tracks mousemove with useMotionValue, smoothed by useSpring at stiffness 400, damping 45, mass 1
- Default is a small filled circle, mix-blend-mode difference with a white fill
- Hover states driven by a data-cursor attribute:
    data-cursor="link"  scales up, reduces opacity
    data-cursor="view"  expands into a larger circle containing the label "View"
    data-cursor="drag"  shows horizontal arrows
- Magnetic: within a radius of data-cursor-magnetic elements, pull toward centre with
  distance falloff, snap back on leave
- Returns null when matchMedia('(hover: none)').matches
- Returns null when useReducedMotion() is true
- Never blocks pointer events

src/components/motion/
  TextReveal.tsx   splits text into word or letter spans, staggers y and opacity, --ease-out-expo
  Marquee.tsx      infinite horizontal loop, content duplicated for seamless wrap, linear easing, pauses on hover
  Parallax.tsx     wraps useScroll and useTransform
  CountUp.tsx      animates a number on viewport entry, formats output
  Reveal.tsx       generic whileInView fade and rise

src/components/ui/CopyButton.tsx
  Copy-to-clipboard where the icon morphs in place from copy to check, then back after
  2 seconds. No toast. Used on the email address and any code shown in case studies.

src/components/ui/SlideToConfirm.tsx already exists. Read it, do not rewrite it.

It is a drag-to-confirm control using the Y mark as the thumb. It takes a `purpose` prop
that selects the copy and colour: submit-lead, to-payment, start-subscription,
send-broadcast, or delete. It exposes role="slider", supports arrow-key stepping and
Enter or Space to complete, becomes a single-press button under prefers-reduced-motion,
handles async onConfirm with rollback on failure, and returns a SlideSignals payload
capturing drag duration, pointer sample count, peak velocity and whether keyboard was used.

Interaction model matches Resend's OAuth confirm exactly:
  - The label stays fully visible and does NOT fade. The thumb is opaque and physically
    slides over it. This is what makes it feel like an object rather than a progress bar.
  - The track can be grabbed anywhere, not only on the thumb.
  - A faint fill trails the thumb and the border brightens as progress builds.
  - Releasing before the end springs the thumb back.

On completion the Y mark fades out and a checkmark draws itself inside the same thumb,
while the thumb gives a small scale bounce. The checkmark path is two exact 45 degree
segments with square caps and mitred joins, so it shares the mark's geometry language.
Under reduced motion the checkmark appears instantly without drawing.

If the file is missing, recreate it from this source:

---8<--- src/components/ui/SlideToConfirm.tsx
"use client";

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * SlideToConfirm — deliberate-friction control for irreversible actions.
 *
 * Interaction model, matching Resend's OAuth confirm:
 *   - The label stays fully visible and does NOT fade. The thumb is opaque and
 *     physically slides over it. This is what makes the control feel like an
 *     object rather than a progress bar.
 *   - The track is a recessed groove, the thumb sits above it.
 *   - The track can be grabbed anywhere, not only on the thumb.
 *   - An accent-tinted trail follows the thumb and the rim brightens with
 *     progress, so commitment is visible before it completes.
 *   - Releasing before the end springs the thumb back.
 *   - On completion the Y mark fades and a checkmark draws in the same thumb.
 *
 * The label shimmers gently until first interaction. That is the affordance
 * telling people it is draggable, borrowed from slide-to-unlock. It stops
 * permanently once touched so it never nags.
 *
 * Only use this where the action cannot be cleanly undone: submitting a lead,
 * handing off to payment, starting a subscription, sending a broadcast,
 * deleting a record. On an ordinary button it is just an annoying gimmick.
 *
 * Accessibility is not optional. Drag-only would exclude keyboard and switch
 * users, so this exposes role="slider", arrow-key stepping, and Enter or Space
 * to complete. Under prefers-reduced-motion it becomes a single-press button,
 * the shimmer never runs, and the checkmark appears without drawing.
 */

export type SlideSignals = {
  durationMs: number;
  pointerSamples: number;
  peakVelocity: number;
  usedKeyboard: boolean;
};

export type SlidePurpose =
  | "submit-lead"
  | "to-payment"
  | "start-subscription"
  | "send-broadcast"
  | "delete";

type SlideToConfirmProps = {
  purpose: SlidePurpose;
  label?: string;
  completedLabel?: string;
  pendingLabel?: string;
  ariaLabel: string;
  onConfirm: (signals: SlideSignals) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

const COPY: Record<
  SlidePurpose,
  { label: string; pending: string; done: string; danger: boolean }
> = {
  "submit-lead": {
    label: "Slide to send",
    pending: "Sending",
    done: "Sent",
    danger: false,
  },
  "to-payment": {
    label: "Slide to continue to payment",
    pending: "Opening checkout",
    done: "Redirecting",
    danger: false,
  },
  "start-subscription": {
    label: "Slide to start your Care Plan",
    pending: "Setting up",
    done: "Started",
    danger: false,
  },
  "send-broadcast": {
    label: "Slide to send",
    pending: "Sending",
    done: "Sent",
    danger: false,
  },
  delete: {
    label: "Slide to delete",
    pending: "Deleting",
    done: "Deleted",
    danger: true,
  },
};

const TRACK_H = 64;
const THUMB_W = 88;
const THUMB_H = 54;
const PAD = 5;
const COMPLETE_AT = 0.985;

const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";
/** Two exact 45 degree segments, same stroke language as the mark. */
const CHECK = "M75 105 L100 130 L150 80";

const EASE = [0.16, 1, 0.3, 1] as const;

const SHIMMER_CSS = `
@keyframes yc-slide-shimmer {
  0%   { background-position: 140% 0; }
  100% { background-position: -140% 0; }
}
.yc-slide-shimmer {
  background: linear-gradient(90deg,
    var(--text-secondary, #8a8f98) 0%,
    var(--text-secondary, #8a8f98) 38%,
    var(--text-primary, #f7f8f8) 50%,
    var(--text-secondary, #8a8f98) 62%,
    var(--text-secondary, #8a8f98) 100%);
  background-size: 280% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: yc-slide-shimmer 3.4s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .yc-slide-shimmer { animation: none; -webkit-text-fill-color: currentColor; background: none; }
}
`;

function hexish(varExpr: string, fallback: [number, number, number]) {
  return fallback;
}

export function SlideToConfirm({
  purpose,
  label,
  completedLabel,
  pendingLabel,
  ariaLabel,
  onConfirm,
  disabled = false,
  className,
}: SlideToConfirmProps) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxX, setMaxX] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const copy = COPY[purpose];
  const accent = copy.danger
    ? "var(--danger, #e5484d)"
    : "var(--accent, #5e6ad2)";
  const rgb = hexish(accent, copy.danger ? [229, 72, 77] : [94, 106, 210]);

  const x = useMotionValue(0);
  const safeMax = Math.max(maxX, 1);

  /** Accent trail that follows the thumb. */
  const fillWidth = useTransform(x, (v) => `${PAD + v + THUMB_W / 2}px`);
  const fillBg = useTransform(x, [0, safeMax], [
    `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.05)`,
    `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.18)`,
  ]);
  /** Recessed groove whose rim brightens with progress. */
  const trackShadow = useTransform(x, [0, safeMax], [
    "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 0.5px rgba(255,255,255,0.09)",
    "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 0.5px rgba(255,255,255,0.31)",
  ]);

  const signals = useRef({ start: 0, samples: 0, peak: 0, keyboard: false });

  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      setMaxX(trackRef.current.clientWidth - THUMB_W - PAD * 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const markTouched = () => {
    if (!touched) setTouched(true);
    if (!signals.current.start) signals.current.start = Date.now();
  };

  const complete = useCallback(async () => {
    if (done || busy || disabled) return;
    setBusy(true);
    animate(x, maxX, { duration: 0.2, ease: EASE });
    const s = signals.current;
    try {
      await onConfirm({
        durationMs: s.start ? Date.now() - s.start : 0,
        pointerSamples: s.samples,
        peakVelocity: Math.round(s.peak),
        usedKeyboard: s.keyboard,
      });
      setDone(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch {
      animate(x, 0, { duration: 0.42, ease: EASE });
    } finally {
      setBusy(false);
    }
  }, [done, busy, disabled, maxX, onConfirm, x]);

  /** Grabbing the bare track jumps the thumb under the pointer. */
  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (disabled || done || busy || reduceMotion) return;
    markTouched();
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const local = e.clientX - rect.left - PAD - THUMB_W / 2;
    if (local <= x.get() + THUMB_W && local >= x.get() - THUMB_W) return;
    animate(x, Math.max(0, Math.min(maxX, local)), {
      duration: 0.25,
      ease: EASE,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || done || busy) return;
    markTouched();
    signals.current.keyboard = true;

    const step = maxX / 6;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      animate(x, Math.min(maxX, x.get() + step), { duration: 0.15 });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      animate(x, Math.max(0, x.get() - step), { duration: 0.15 });
    } else if (e.key === "Enter" || e.key === " " || e.key === "End") {
      e.preventDefault();
      void complete();
    }
  };

  const currentLabel = done
    ? completedLabel ?? copy.done
    : busy
      ? pendingLabel ?? copy.pending
      : label ?? copy.label;

  const inert = disabled || done || busy;
  const shimmering = !touched && !inert && !reduceMotion;

  const strokeProps = {
    fill: "none",
    stroke: "#0f1011",
    strokeWidth: 15,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };

  return (
    <div className={className}>
      <style dangerouslySetInnerHTML={{ __html: SHIMMER_CSS }} />

      <motion.div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        style={{
          position: "relative",
          height: TRACK_H,
          borderRadius: 9999,
          background: "#131416",
          boxShadow: done
            ? `inset 0 0 0 0.5px ${accent}`
            : trackShadow,
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
          cursor: inert ? "default" : "pointer",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: done ? "100%" : fillWidth,
            background: done
              ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.16)`
              : fillBg,
            pointerEvents: "none",
          }}
        />

        {/* Label never fades. The thumb is opaque and slides over it. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            pointerEvents: "none",
          }}
        >
          <span
            className={shimmering ? "yc-slide-shimmer" : undefined}
            style={{
              color: done
                ? "var(--text-primary, #f7f8f8)"
                : "var(--text-secondary, #8a8f98)",
              transition: "color 0.3s",
            }}
          >
            {currentLabel}
          </span>
        </div>

        <motion.div
          role="slider"
          tabIndex={inert ? -1 : 0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={done ? 100 : 0}
          aria-disabled={inert}
          aria-busy={busy}
          onKeyDown={onKeyDown}
          drag={reduceMotion || inert ? false : "x"}
          dragConstraints={{ left: 0, right: maxX }}
          dragElastic={0}
          dragMomentum={false}
          onPointerDown={markTouched}
          onDrag={(_, info) => {
            signals.current.samples += 1;
            const v = Math.abs(info.velocity.x);
            if (v > signals.current.peak) signals.current.peak = v;
            if (x.get() >= maxX * COMPLETE_AT) void complete();
          }}
          onDragEnd={() => {
            if (!done && !busy) {
              animate(x, 0, { duration: 0.42, ease: EASE });
            }
          }}
          onClick={() => {
            if (reduceMotion) void complete();
          }}
          animate={done ? { scale: [1, 1.07, 1] } : undefined}
          whileTap={reduceMotion || inert ? undefined : { scale: 1.045 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{
            x,
            position: "absolute",
            top: PAD,
            left: PAD,
            width: THUMB_W,
            height: THUMB_H,
            borderRadius: 9999,
            background: "linear-gradient(180deg, #ffffff 0%, #eceef1 100%)",
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: reduceMotion ? "pointer" : inert ? "default" : "grab",
          }}
        >
          <svg width={28} height={31} viewBox="40 30 140 155" aria-hidden>
            <AnimatePresence mode="wait">
              {!done ? (
                <motion.g
                  key="mark"
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <path d={CHEVRON} {...strokeProps} />
                  <path d={ARM} {...strokeProps} />
                  <rect x={99} y={155} width={34} height={17} fill={accent} />
                </motion.g>
              ) : (
                <motion.path
                  key="check"
                  d={CHECK}
                  {...strokeProps}
                  stroke={accent}
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.35,
                    delay: reduceMotion ? 0 : 0.12,
                    ease: EASE,
                  }}
                />
              )}
            </AnimatePresence>
          </svg>
        </motion.div>
      </motion.div>

      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary, #8a8f98)",
          textAlign: "center",
          margin: "12px 0 0",
        }}
      >
        {reduceMotion
          ? "Press to confirm."
          : "Drag the mark, or focus it and press Enter."}
      </p>
    </div>
  );
}
---8<---

Every primitive checks useReducedMotion() and renders the resting state when reduced
motion is on. Animate only transform and opacity.
```

---

## Prompt 4 — Convex schema and admin auth

```
Set up the Convex backend.

convex/schema.ts:

leads
  name, email, company, role, projectType, tier, budget, timeline,
  pageCount, message, score, status, source, currency,
  vatNumber, crNumber, entityType, turnstileVerified, slideSignals
  indexes: by_status, by_tier, by_created

projects
  title, slug, client, year, category, coverUrl, gallery, summary,
  problem, process, result, metrics, techStack, liveUrl, status, order, featured
  indexes: by_slug, by_status, by_featured

testimonials
  author, role, company, quote, avatarUrl, projectId, featured, order
  index: by_featured

feedback
  projectId, rating, comment, from, resolved
  index: by_project

events
  type, path, sessionId, ts, meta
  index: by_type_ts

broadcasts
  subject, audienceId, status, resendId, scheduledAt, sentAt, openRate, clickRate, recipientCount
  index: by_status

posts
  title, slug, body, excerpt, coverUrl, published, publishedAt, tags, readingTime
  indexes: by_slug, by_published

kb
  question, answer, tags, priority
  index: by_tag

proposals
  leadId, tier, amount, currency, status, sentAt, signedAt, notes
  index: by_status
  status values: draft, sent, security_review, procurement, signed, lost

invoices
  leadId, projectId, amount, currency, vatAmount, stripeId, status, dueDate, issuedAt
  index: by_status

Use the v validator builder. One index per access pattern, fields in query order.

Convex Auth:
- GitHub OAuth provider
- Restrict sign-in to a single GitHub account via an ADMIN_GITHUB_ID env var. Reject any
  other account at the callback.
- convexAuthNextjsMiddleware in middleware.ts protecting every /admin route
- src/app/ConvexClientProvider.tsx as a client component wrapping ConvexAuthProvider
- Server components use preloadQuery with convexAuthNextjsToken()

Known issue: usePreloadedQuery can hydrate before the client websocket authenticates.
Handle loading explicitly with the Authenticated, Unauthenticated and AuthLoading
components rather than assuming auth is ready.

A query and mutation per table. Every admin mutation verifies caller identity server-side.
Never trust the client.
```

---

## Prompt 5 — Hero and marketing shell

```
Build the public shell and the hero.

Nav: glass pill, fixed, condenses on scroll. Left is the Logo lockup. Centre is Work,
Services, Pricing, About, Blog. Right is a "Start a project" button. Mobile is a
full-screen glass overlay.

Footer: contact, social links, availability status, sitemap. Email uses the CopyButton.

Hero, three stacked layers:

Layer 1, behind: YUSUF DIALLO at clamp(4rem, 18vw, 20rem), weight 600, tracking -0.022em,
low opacity. This is the person, not the brand.

Layer 2, middle: a cut-out portrait, transparent PNG, centred so head and shoulders
occlude the top of the name. The name must read as passing behind him.

Layer 3, front: eyebrow line, one-sentence value proposition, a "Start a project" CTA,
availability pill.

Load sequence, one orchestrated moment rather than scattered effects:
1. Name reveals per letter with a clip-path inset wipe, staggered, --ease-out-expo
2. Portrait fades and rises
3. Foreground text and CTA fade in last

Scroll: the name translates slower than the portrait for parallax depth. Nav condenses.

Use a placeholder silhouette with a clear TODO marking where the real cut-out goes.

Below the hero: tech stack marquee of the 21 items, short intro, three featured projects,
services, availability CTA.

Responsive to 320px. Keyboard navigable. No layout shift in the hero.
```

---

## Prompt 6 — Pricing page

```
Build the pricing page. Highest-value page on the site.

Three bands top to bottom.

BAND 1, three cards side by side. Never four, four hurts conversion.

  Launch, one page
    900 USD / 3,375 SAR / 3,300 AED
    Landing page or one-pager, blog, contact form, SEO basics, mobile-first, deployed

  Growth, 3 to 9 pages          badge: Most popular, visually dominant
    Page count slider, 3 to 9
    Price formula: 1800 + 450 * (pages - 3)
    3 pages = 1,800 USD, 9 pages = 4,500 USD
    Price updates live as the slider moves, number animates rather than snapping
    Everything in Launch plus CMS, multi-page IA, analytics

  Web app / SaaS MVP
    From 6,000 USD / 22,500 SAR / 22,000 AED
    Auth, database, Stripe payments, dashboards, API integrations

BAND 2, full width, darker glass with a gold accent edge:

  Enterprise
    From 13,000 USD / 49,000 SAR / 48,000 AED
    Up to 25 pages scoped in the proposal
    Bilingual English and Arabic with full RTL mirroring
    Design system and component library handover
    CMS with multi-user roles and approval workflows
    WCAG 2.2 AA accessibility
    Custom integrations, CRM and ERP
    Staging environment and staged rollout
    Security questionnaire support, NDA, SSO
    Dedicated Slack channel, priority response
    Team training session plus written documentation
    30 days post-launch support
    Uptime and performance SLA requires an active Care Plan
    CTA is <SlideToConfirm purpose="submit-lead" label="Slide to request a proposal" />

BAND 3, separate aftercare section, not compared against build tiers:

  Care Plan
    450 USD / 1,690 SAR / 1,650 AED per month
    Hosting, maintenance, unlimited small edits, SEO monitoring,
    monthly analytics report, priority support
    CTA is <SlideToConfirm purpose="start-subscription" /> which creates the Stripe
    subscription session

Currency toggle:
- USD, SAR, AED
- Defaults from visitor locale, always overridable, persists in localStorage
- SAR pegged 3.75, AED 3.67, stored as constants in src/lib/pricing.ts
- Numbers animate on currency change

All pricing logic lives in src/lib/pricing.ts as pure typed functions. No prices hardcoded
in components.

Below: comparison table, then an FAQ accordion covering timeline, payment terms,
revisions, ownership, hosting, and what happens after launch.

Every build-tier CTA routes into the lead form with that tier pre-filled.
```

---

## Prompt 7 — Lead flow

```
Build the inquiry system. This is the money path.

MULTI-STEP FORM at /start

Step 1: What are you building?
  One-page site, Multi-page site, Web app or SaaS, Enterprise project, Ongoing support
  This selection branches the flow.

Step 2 standard: budget range, timeline, page or feature count, existing brand assets
Step 2 enterprise: company, role, procurement process, NDA required, target launch date.
  Skip the pricing calculator entirely on this path.

Step 3: name, email, company, message

Rules:
- Progress bar across the top
- One question group per step, large tap targets
- Step advance uses ordinary buttons. Only the final submit is a slide.
- Validate per step, never lose data when moving back
- Prefill tier when arriving from a pricing CTA
- Full keyboard navigation, correct autocomplete attributes
- Track step entry and exit as Convex events so drop-off is visible in the dashboard

Final submit:
  <SlideToConfirm purpose="submit-lead" ariaLabel="Slide to send your project inquiry" onConfirm={...} />

SPAM PROTECTION, four layers:
1. Cloudflare Turnstile, invisible mode, token verified server-side in a Convex action
2. Honeypot field, hidden from sighted and screen reader users
3. Time trap, reject submissions under 2 seconds
4. SlideSignals stored on the lead. Flag as suspicious when pointerSamples is 0 and
   usedKeyboard is false, or when peakVelocity is implausibly uniform. This is a signal,
   not a verdict — never hard-block on it alone, since keyboard and reduced-motion users
   legitimately produce zero pointer samples.

LEAD SCORING, server-side on submit:
  score = budget weight x urgency weight x fit weight
  Output a hot / warm / cold band. Enterprise submissions are always hot.

ON SUBMIT, in order:
1. Write the lead to Convex
2. Branded confirmation email to the visitor via Resend
3. Notify Yusuf: email to notifications@yusufcreates.com plus optional Slack webhook
4. Schedule day 3 and day 7 follow-up nudges with Convex scheduled functions, cancelled
   if lead status changes
5. Return the animated success state

SUCCESS STATE, not a toast:
- Checkmark draws in with pathLength
- "What happens next" as three numbered steps: I review within 24 hours, I send a short
  Loom plus a few questions, we book a call
- Inline calendar booking link
- Summary of what they submitted
- Where a deposit applies, a <SlideToConfirm purpose="to-payment" /> that creates the
  Stripe Checkout session and redirects

EMAILS in emails/:
  LeadConfirmation.tsx    visitor-facing, branded, warm, submission summary, next steps, booking link
  LeadNotification.tsx    internal, dense, score badge, all fields, one-click reply
  EnterpriseInquiry.tsx   more formal, references the capability one-pager

All templates use the design tokens. Dark and light email client safe. Plain text fallbacks.

Resend:
  Transactional from hello@ and notifications@ on yusufcreates.com
  Broadcasts from a separate subdomain send.yusufcreates.com so a bad campaign cannot
  damage transactional deliverability
  Document the Namecheap DNS records in the README
```

---

## Prompt 8 — Admin dashboard

```
Build /admin. Auth-gated, single admin, Convex Auth.

Shell: persistent glass sidebar, breadcrumbs, dark by default.

COMMAND PALETTE, build this first, it sets the tone:
- cmd+K opens it, built with cmdk
- Jump to any section, search leads by name or company, open a project, start a broadcast,
  toggle availability status
- Fuzzy match, keyboard-only operable, recent actions at the top
- Glass panel, same visual language as the rest of the site

Sections:

Overview
  Hot leads needing a reply, pipeline value by tier, active projects,
  last 7 days traffic, revenue this month, one "needs your attention" list

Leads and inquiries
  Table filtered by status, tier and score. Hot, warm, cold badges.
  Detail drawer with full submission, notes, slide signals, status pipeline
  new -> contacted -> proposal sent -> won -> lost
  One-click reply opening a pre-filled email

Analytics
  First-party, from the Convex events table. No third-party tracker, no cookie banner.
  Pageviews, top pages, referrers, CTA click-through, form funnel drop-off by step,
  pricing page currency and slider interactions
  Recharts. Date range picker.

Projects and case studies
  Full CRUD. Rich text for problem, process and result. Image upload to Convex file storage.
  Metrics rows, tech stack tags, drag to reorder, draft and published states.

Testimonials
  CRUD, feature toggle, reorder, avatar upload

Feedback
  Incoming client feedback grouped by project, resolved toggle

Broadcasting
  Split view: composer on the left, live React Email preview on the right that re-renders
  as you type. This is the signature screen, it should feel like a real product.
  Manage Resend audiences, view open and click rates.
  "Send a test to myself" before any real send.
  The real send is:
    <SlideToConfirm purpose="send-broadcast" label={`Slide to send to ${count} people`} />
  where count is the live recipient number. Sending is irreversible, so it earns the gesture.

Blog
  CRUD, markdown or rich text, slug, cover, tags, publish scheduling, reading time

AI bot knowledge base
  CRUD over the kb table, question and answer pairs, tags, priority
  Test console for trying prompts against the current knowledge base
  Shows the current token count of the assembled system prompt

Proposals and invoices
  Pipeline: draft, sent, security review, procurement, signed, lost
  Invoice generator with Saudi ZATCA compliance and 15 percent VAT,
  VAT number and CR number fields, PDF export
  Stripe payment links for deposits

Settings
  Profile, availability status, email and domain config, currency rates, integrations

Destructive deletes use <SlideToConfirm purpose="delete" /> instead of a confirm dialog.

Every mutation verifies caller identity server-side. Optimistic UI where it helps, always
with rollback on failure.
```

---

## Prompt 9 — AI assistant

```
Build the site AI assistant.

Architecture decision: do not build RAG. The knowledge base is a few dozen question and
answer pairs. Stuff the entire kb table into a cached system prompt instead. A vector
database is unnecessary until content exceeds roughly 500k tokens.

Implementation:
- Route handler at src/app/api/chat/route.ts
- Anthropic SDK, Claude Haiku, pinned to a date-stamped model ID
- Assemble the system prompt from the Convex kb table plus a persona block describing
  Yusuf, his stack, his pricing tiers and his availability
- cache_control on the system block. Cache reads cost about 10 percent of input tokens,
  so this pays for itself after a single read.
- Stream the response
- Cap max_tokens
- Rate limit per session and per IP, enforced in Convex
- Log every conversation to Convex for review

Frontend:
- Glass chat panel launched from a floating pill in the bottom corner
- Streaming text render
- Suggested opening questions pulled from the kb priority field
- When someone asks about pricing or hiring, surface a "Start a project" CTA inside the chat
- Focus trap when open, escape to close, full keyboard access

Guardrails in the system prompt:
- Only answer questions about Yusuf, his work, services and pricing
- Never invent project details, client names or prices
- If unsure, say so and offer the contact form
- Never produce code for the visitor, this is not a coding assistant
```

---

## Prompt 10 — Stripe

```
Add payments.

Scope:
1. Deposit invoices, 30 percent of project value, one-off Checkout sessions, entered from
   the lead success screen via SlideToConfirm purpose="to-payment"
2. Care Plan, recurring subscription at 450 USD per month with SAR and AED price variants,
   entered from the pricing page via SlideToConfirm purpose="start-subscription"
3. Enterprise is invoiced manually. Do not put Enterprise behind Checkout, procurement
   will not pay by card.

Build:
- Stripe products and prices for the Care Plan in all three currencies
- A Convex action creating a Checkout session from a lead or proposal record
- Webhook handler at src/app/api/stripe/webhook/route.ts, signature verified, handling
  checkout.session.completed, invoice.paid, invoice.payment_failed,
  customer.subscription.updated, customer.subscription.deleted
- Webhook events update the invoices and proposals tables
- Billing view in the dashboard: subscription status, payment history, failed payments
- Idempotency keys on every write, webhooks retry

Never trust client-side amounts. Prices resolve server-side from src/lib/pricing.ts.
The slide control returns a promise — keep it in its pending state until the Checkout
session URL comes back, then redirect.
```

---

## Prompt 11 — SEO, performance and deploy

```
Final pass before launch.

SEO:
- Metadata API on every route, title templates, canonical URLs, metadataBase
- JSON-LD emitted server-side, two linked nodes joined by @id:
    Person, Yusuf Diallo, the author
    ProfessionalService, YusufCreates, based in Madinah, Saudi Arabia, serving the Gulf
    and globally
  Plus FAQPage on pricing and BlogPosting on posts
- Programmatic app/sitemap.ts and app/robots.ts
- Open Graph images per route, 1200x630
- llms.txt for AI crawlers
- Long-tail targets: web developer Madinah, Next.js developer Saudi Arabia,
  Convex developer, bilingual Arabic website developer. Do not chase head terms.

Performance:
- Audit Core Web Vitals with the animation load in place. Measure INP, not FID.
- Lazy-mount below-the-fold Motion components
- content-visibility on long sections
- Confirm no animation touches anything other than transform and opacity
- next/font self-hosting Inter as the fallback, next/image everywhere, explicit dimensions
  to prevent CLS
- Target Lighthouse 90 or above across all four categories

Accessibility audit:
- Keyboard-only pass through every flow: the multi-step form, all five slide controls,
  the command palette, the dashboard
- Screen reader pass on the hero and pricing page
- Verify prefers-reduced-motion, prefers-reduced-transparency and prefers-contrast each
  do something real
- Confirm every SlideToConfirm completes without a mouse and becomes a press-to-confirm
  button under reduced motion
- Colour contrast on glass surfaces, tint behind text where needed

Deploy:
- Vercel project connected to the GitHub repo, auto-deploy on main
- Env vars set in Vercel, production Convex deployment
- Namecheap DNS instructions in the README:
    A and CNAME records pointing yusufcreates.com and www at Vercel
    Resend verification records for yusufcreates.com
    Separate Resend records for send.yusufcreates.com
- Stripe webhook endpoint registered against the production URL
- Post-deploy checklist: submit a test lead end to end, verify both emails arrive,
  verify the dashboard receives it, verify Turnstile blocks a scripted submission,
  verify every slide control works on a real phone
```

---

## Order of operations

Prompts 0 through 4 are foundation, strict sequence. Prompts 5 through 8 can be reordered
if you want the front end sooner. Prompts 9 through 11 last.

Verify after each: run the dev server, check it renders, commit before moving on.

## Before you start

- [ ] Copy Logo.tsx and SlideToConfirm.tsx into src/components/ui/
- [ ] Confirm Namecheap is registrar only, Vercel is the host
- [ ] Confirm Stripe scope: deposits plus Care Plan subscription
- [ ] Decide the accent colour. `#5e6ad2` is Linear's actual indigo — the two-tone wordmark
      puts it on "Creates", so it carries real weight. Consider something distinctive.
- [ ] Get a cut-out portrait, transparent background, shoulders up
- [ ] Register accounts: Resend, Cloudflare for Turnstile, Anthropic API
- [ ] Claim @yusufcreates on X, Instagram, LinkedIn
