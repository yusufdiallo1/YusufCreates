/**
 * The glass control — two axes, and the mapping from them to CSS variables.
 *
 * Shared by the React component and by the pre-paint script in layout.tsx, so
 * there is exactly one definition of what a given setting means. The script
 * runs before hydration and this module runs after; if the two disagreed by a
 * hundredth the whole interface would shift on mount.
 *
 * AXIS NAMING. The spec calls axis 1 "Transparency" and maps 0 → clear,
 * 100 → solid. Higher transparency meaning less transparent is backwards, so
 * the value is called `frost` here and labelled "Frost — clear to solid" in
 * the UI. The mapping is the spec's, unchanged; only the name is honest.
 */

export interface GlassSettings {
  /** 0 clear → 100 solid. */
  frost: number;
  /** 0 soft → 100 firm. */
  contrast: number;
}

export const GLASS_DEFAULTS: GlassSettings = { frost: 55, contrast: 30 };

export const GLASS_STORAGE_KEY = "yc.glass";

/** Linear interpolation, with the input clamped to 0–100 first. */
function lerp(value: number, from: number, to: number): number {
  const t = Math.min(100, Math.max(0, value)) / 100;
  return from + (to - from) * t;
}

function round(n: number, places = 3): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/**
 * The mapping. Every glass variable in globals.css is derived from these two
 * numbers, so this function is the entire visual contract of the control.
 *
 * Refraction is a hard cut rather than a fade: the SVG displacement filter is
 * either worth its cost or it is not, and a 30%-strength refraction is just a
 * blurry edge. Above frost 70 the material is solid enough that there is
 * nothing left to refract.
 */
export function glassVars(s: GlassSettings): Record<string, string> {
  const alpha = round(lerp(s.frost, 0.1, 0.96));
  const blur = round(lerp(s.frost, 28, 0), 1);
  const refraction = s.frost > 70 ? 0 : 1;

  // Backing is the canvas colour, so it darkens toward the page rather than
  // introducing a tint of its own.
  const backing = round(lerp(s.contrast, 0, 0.85));
  const separator = round(lerp(s.contrast, 0.08, 0.32));
  const outline = round(lerp(s.contrast, 0.14, 0.45));

  /*
   * Optical effects strip out as contrast rises. At contrast 100 the specular
   * inset is gone entirely — that highlight is the single most decorative part
   * of the material, and someone who has asked for maximum contrast is asking
   * for it to stop.
   */
  const specular = round(lerp(s.contrast, 1, 0));

  return {
    "--glass-alpha": String(alpha),
    "--glass-blur": `${blur}px`,
    "--glass-refraction": String(refraction),
    "--glass-backing": `rgba(8, 9, 10, ${backing})`,
    "--separator-alpha": String(separator),
    "--outline-alpha": String(outline),
    "--specular-strength": String(specular),
  };
}

/** Applies the mapping to an element, normally document.documentElement. */
export function applyGlass(el: HTMLElement, s: GlassSettings): void {
  const vars = glassVars(s);
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}

/**
 * Reads stored settings, falling back to the OS accessibility preferences and
 * then to the defaults.
 *
 * The media queries are only consulted when there is NO stored value. Someone
 * who has moved the sliders has expressed a preference more specific than the
 * OS one, and overriding it on every load would make the control feel broken.
 */
export function resolveGlass(): GlassSettings {
  const stored = readStored();
  if (stored) return stored;

  const next = { ...GLASS_DEFAULTS };
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) {
      next.frost = 95;
    }
    if (window.matchMedia("(prefers-contrast: more)").matches) {
      next.contrast = 80;
    }
  }
  return next;
}

export function readStored(): GlassSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GLASS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GlassSettings>;
    if (
      typeof parsed?.frost !== "number" ||
      typeof parsed?.contrast !== "number" ||
      Number.isNaN(parsed.frost) ||
      Number.isNaN(parsed.contrast)
    ) {
      return null;
    }
    return {
      frost: Math.min(100, Math.max(0, parsed.frost)),
      contrast: Math.min(100, Math.max(0, parsed.contrast)),
    };
  } catch {
    // Private browsing refuses reads. Defaults are a fine answer.
    return null;
  }
}

export function writeStored(s: GlassSettings): void {
  try {
    window.localStorage.setItem(GLASS_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Refused writes are survivable — the setting just does not persist.
  }
}

export function clearStored(): void {
  try {
    window.localStorage.removeItem(GLASS_STORAGE_KEY);
  } catch {
    // Same.
  }
}

/* ---------------------------------------------------------------------------
   A tiny external store, so the control can read localStorage through
   useSyncExternalStore rather than through setState-in-an-effect.

   The effect version worked, but it is the pattern React's own lint rule warns
   about: it renders once with the default, then immediately schedules a second
   render with the real value. useSyncExternalStore is the primitive built for
   exactly this — a value that lives outside React and differs between server
   and client. React calls getServerSnapshot while hydrating and getSnapshot
   afterwards, and reconciles the difference itself without a mismatch warning.

   `current` is cached because getSnapshot MUST be referentially stable between
   calls. Returning a fresh object each time is an infinite render loop.
   --------------------------------------------------------------------------- */

let current: GlassSettings | null = null;
const listeners = new Set<() => void>();

export function subscribeGlass(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGlassSnapshot(): GlassSettings {
  current ??= resolveGlass();
  return current;
}

/** The server has no storage and no media queries — always the defaults. */
export function getGlassServerSnapshot(): GlassSettings {
  return GLASS_DEFAULTS;
}

/** Single write path: updates the store, the DOM and storage together. */
export function setGlass(next: GlassSettings, persist = true): void {
  current = next;
  applyGlass(document.documentElement, next);
  if (persist) writeStored(next);
  for (const listener of listeners) listener();
}

/** Drops the stored override and falls back to OS preferences / defaults. */
export function resetGlass(): void {
  clearStored();
  setGlass(resolveGlass(), false);
}
