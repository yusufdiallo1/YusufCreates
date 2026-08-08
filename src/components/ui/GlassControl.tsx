"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getGlassServerSnapshot,
  getGlassSnapshot,
  GLASS_DEFAULTS,
  resetGlass,
  setGlass,
  subscribeGlass,
  type GlassSettings,
} from "@/lib/glass";

/**
 * The glass control — two axes over the material the whole interface is made
 * of.
 *
 * This is an accessibility control first. Someone who finds translucent
 * surfaces hard to read can push contrast up and get a fully opaque, high
 * contrast interface with no optical effects at all, without leaving the page
 * and without hunting through OS settings. That it also demonstrates the
 * material is a secondary benefit, and the reason it is not buried.
 *
 * WHY NOT A CONTEXT. The values live on document.documentElement as CSS custom
 * properties, so every surface on the page — including ones rendered by server
 * components, and ones outside this React tree — responds without subscribing
 * to anything. React state here only drives the two inputs and the readout.
 *
 * FIRST PAINT is handled by the inline script in layout.tsx, not by this
 * component. By the time this mounts the variables are already correct; the
 * store below only tells React where to put the slider thumbs.
 */
export function GlassControl({ className }: { className?: string }) {
  /*
   * useSyncExternalStore, not useState + an effect.
   *
   * The settings live in localStorage and on document.documentElement — both
   * outside React, and neither visible to the server. This is the primitive
   * built for that: React reads getServerSnapshot while hydrating and
   * getSnapshot afterwards, and reconciles the two itself. The effect version
   * rendered once with the defaults and then scheduled a second render, which
   * is the cascade react-hooks/set-state-in-effect exists to catch.
   */
  const settings = useSyncExternalStore(
    subscribeGlass,
    getGlassSnapshot,
    getGlassServerSnapshot,
  );

  const update = useCallback((next: GlassSettings) => setGlass(next), []);
  const reset = useCallback(() => resetGlass(), []);

  const isDefault =
    settings.frost === GLASS_DEFAULTS.frost &&
    settings.contrast === GLASS_DEFAULTS.contrast;

  return (
    <section
      aria-labelledby="glass-control-heading"
      className={className}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="glass-control-heading"
          className="font-mono text-xs tracking-[0.08em] text-secondary uppercase"
        >
          Glass
        </h2>
        {/* Only offered once there is something to undo. */}
        {!isDefault ? (
          <button
            type="button"
            onClick={reset}
            className="rounded-[var(--radius-xs)] text-xs text-accent transition-colors duration-hover ease-hover hover:text-primary"
          >
            Reset
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted">
        How solid the translucent surfaces are, and how hard their edges read.
      </p>

      <div className="mt-4 flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Axis
            id="glass-frost"
            label="Frost"
            hint="clear → solid"
            value={settings.frost}
            onChange={(frost) => update({ ...settings, frost })}
          />
          <Axis
            id="glass-contrast"
            label="Contrast"
            hint="soft → firm"
            value={settings.contrast}
            onChange={(contrast) => update({ ...settings, contrast })}
          />
        </div>

        {/*
          Live preview. A real glass surface rather than a swatch of colour,
          sitting over a patterned backing so the blur has something to act on
          — over a flat fill, changing the blur radius does nothing visible and
          the control looks broken.
        */}
        <div
          aria-hidden="true"
          className="relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-2"
        >
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,var(--accent)_0_6px,transparent_6px_12px)] opacity-70" />
          <div className="glass-depth glass-near absolute inset-2 rounded-[var(--radius-xs)]" />
        </div>
      </div>
    </section>
  );
}

function Axis({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs text-secondary">
          {label}{" "}
          <span className="text-muted">— {hint}</span>
        </label>
        <span className="font-mono text-xs text-muted tabular-nums">
          {value}
        </span>
      </div>
      {/*
        A native range input, not a custom one. It is keyboard operable, has
        real touch targets, announces its value, and supports the whole set of
        Home/End/PageUp/PageDown conventions — all of which a div with a drag
        handler has to reimplement and usually gets wrong.
      */}
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="glass-range mt-1.5 w-full"
      />
    </div>
  );
}
