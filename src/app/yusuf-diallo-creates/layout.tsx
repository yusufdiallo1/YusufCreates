import type { Metadata } from "next";
import { Sidebar } from "@/components/admin/Sidebar";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";

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

      {/* min-w-0 is load-bearing: without it a wide table inside a grid/flex
          child refuses to shrink and pushes the whole page sideways. */}
      <div className="min-w-0 lg:pl-60">
        <AdminShell>
          <AdminGate>{children}</AdminGate>
        </AdminShell>
      </div>
    </div>
  );
}
