import type { Metadata } from "next";
import { Sidebar } from "@/components/admin/Sidebar";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { AdminGate } from "@/components/admin/AdminGate";

/**
 * Admin shell.
 *
 * Three layers of protection, and all three are load-bearing:
 *
 *   1. src/middleware.ts redirects an unauthenticated request at the edge.
 *   2. AdminGate renders a sign-in prompt rather than a broken page if the
 *      session is missing or not the admin.
 *   3. Every Convex query and mutation calls requireAdmin server-side.
 *
 * The first two are convenience. Only the third actually protects the data,
 * because anything reachable over the wire can be called without ever loading
 * this page.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  // An admin surface has no business in a search index.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <CommandPalette />

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 border-b border-[color:var(--border-hairline)] bg-[color:var(--bg-canvas)]/80 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-6 py-3.5 pl-16 lg:pl-6">
            <Breadcrumbs />
            <PaletteHint />
          </div>
        </header>

        <main className="px-6 py-8">
          <AdminGate>{children}</AdminGate>
        </main>
      </div>
    </div>
  );
}

/** Discoverability for the palette — a shortcut nobody knows about is dead. */
function PaletteHint() {
  return (
    <span className="hidden items-center gap-1.5 text-xs text-secondary sm:flex">
      <kbd className="rounded border border-[color:var(--border-hairline)] px-1.5 py-0.5 text-[10px]">
        ⌘K
      </kbd>
      to jump
    </span>
  );
}
