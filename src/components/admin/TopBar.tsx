"use client";

import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { useDensity, type Density } from "@/components/admin/useDensity";

/**
 * The admin top bar.
 *
 * Was a breadcrumb on the left and a ⌘K hint on the right, with the entire
 * width between them empty. It now carries the controls that belong to the
 * whole admin rather than to any one page: search, density, and the hint.
 *
 * Density lives here rather than in Settings because it is a view preference
 * you change while looking at the thing it affects, not a configuration value
 * you set once and forget.
 *
 * Mobile: the search collapses to an icon that opens the palette, and the
 * density toggle hides — it is a pointer-precision preference, and a phone is
 * always comfortable.
 */

export function TopBar({
  density,
  onDensity,
}: {
  density: Density;
  onDensity: (next: Density) => void;
}) {
  /*
   * Search opens the command palette rather than being a second search box.
   *
   * The palette already searches leads and projects and is already bound to
   * ⌘K. A separate input beside it would be two search affordances for one
   * job, and the one people find first would be the weaker one.
   */
  const openPalette = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 pl-16 sm:px-6 lg:pl-6">
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      {/* Wide: a real-looking search affordance. Narrow: just the icon. */}
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search"
        className="hairline flex h-8 items-center gap-2 rounded-lg bg-surface-1 px-2.5 text-[13px] text-secondary transition-colors duration-hover ease-hover hover:text-primary sm:w-56 lg:w-64"
      >
        <SearchIcon />
        <span className="hidden truncate sm:inline">Search everything…</span>
        <kbd className="ml-auto hidden rounded border border-[color:var(--border-hairline)] px-1.5 py-0.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <DensityToggle density={density} onDensity={onDensity} />
    </div>
  );
}

function DensityToggle({
  density,
  onDensity,
}: {
  density: Density;
  onDensity: (next: Density) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Row density"
      /* Hidden on touch: 36px rows are below the comfortable touch target,
         so offering the choice on a phone offers a worse experience. */
      className="hairline hidden items-center rounded-lg p-0.5 md:flex"
    >
      {(
        [
          { id: "comfortable", label: "Comfortable", icon: <RowsWide /> },
          { id: "compact", label: "Compact", icon: <RowsTight /> },
        ] as const
      ).map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onDensity(option.id)}
          aria-pressed={density === option.id}
          title={option.label}
          aria-label={option.label}
          className={`rounded-md p-1.5 transition-colors duration-hover ease-hover ${
            density === option.id
              ? "bg-surface-2 text-primary"
              : "text-secondary hover:text-primary"
          }`}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}

/* Icons are inline and stroke-only so they inherit currentColor and stay
   consistent with the rest of the admin, which uses no icon library. */

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function RowsWide() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="9" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function RowsTight() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="2.6" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="6.7" width="12" height="2.6" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="10.9" width="12" height="2.6" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
