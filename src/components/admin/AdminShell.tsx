"use client";

import { TopBar } from "@/components/admin/TopBar";
import { useDensity } from "@/components/admin/useDensity";

/**
 * Client half of the admin shell.
 *
 * The layout stays a server component — it owns metadata and renders the auth
 * gate — so the density state and the data attribute it drives live here.
 * Wrapping the whole thing rather than just the toolbar is deliberate:
 * --row-h has to be in scope for every table on the page, not only for the
 * control that sets it.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [density, setDensity] = useDensity();

  return (
    <div className="admin-scope" data-density={density}>
      <header className="sticky top-0 z-30 border-b border-[color:var(--border-hairline)] bg-[color:var(--bg-canvas)]/80 backdrop-blur-md">
        <TopBar density={density} onDensity={setDensity} />
      </header>

      {/*
        24px, down from 48. The old value put a marketing page's margin around
        a table. min-w-0 so a wide table scrolls inside its own container
        instead of stretching the page and producing a horizontal scrollbar on
        the body — the single most common way an admin breaks on a phone.
      */}
      <main className="min-w-0 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
