"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Logo } from "@/components/ui/Logo";

/**
 * Admin sidebar.
 *
 * Liquid glass, persistent on desktop, a slide-over on mobile. The section
 * list is grouped rather than flat: eleven undifferentiated links is a wall,
 * and the groups match how the work actually splits — what came in, what I
 * publish, what I send, what I get paid for.
 *
 * aria-current marks the active route, which is what drives both the accent
 * rail and screen reader announcement, so the two can never disagree.
 */

const GROUPS: { heading: string; items: { href: string; label: string }[] }[] = [
  {
    heading: "Inbox",
    items: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/feedback", label: "Feedback" },
    ],
  },
  {
    heading: "Publish",
    items: [
      { href: "/admin/projects", label: "Projects" },
      { href: "/admin/testimonials", label: "Testimonials" },
      { href: "/admin/blog", label: "Blog" },
    ],
  },
  {
    heading: "Reach",
    items: [
      { href: "/admin/broadcasts", label: "Broadcasts" },
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/kb", label: "Knowledge base" },
    ],
  },
  {
    heading: "Money",
    items: [{ href: "/admin/invoices", label: "Proposals and invoices" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useAuthActions();

  // Exact match for the index, prefix match elsewhere — otherwise /admin
  // would stay highlighted on every child route.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const nav = (
    <nav aria-label="Admin sections" className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-3 py-5">
        <Logo variant="mark" className="h-6 w-auto" />
        <span className="text-sm text-primary">Admin</span>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-1 pb-4">
        {GROUPS.map((group) => (
          <div key={group.heading}>
            <h2 className="px-3 pb-1.5 text-[11px] tracking-[0.04em] text-secondary uppercase">
              {group.heading}
            </h2>
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className="admin-nav-link"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-[color:var(--border-hairline)] px-1 py-3">
        <Link
          href="/admin/settings"
          aria-current={isActive("/admin/settings") ? "page" : undefined}
          onClick={() => setMobileOpen(false)}
          className="admin-nav-link"
        >
          Settings
        </Link>
        <Link href="/" className="admin-nav-link">
          View site
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="admin-nav-link w-full text-left"
        >
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop: always present, never collapses. An admin that hides its
          own navigation to save 240px is optimising the wrong thing. */}
      <aside className="liquid-glass fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-[color:var(--border-hairline)] lg:block">
        {nav}
      </aside>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open admin navigation"
        aria-expanded={mobileOpen}
        className="liquid-glass fixed top-4 left-4 z-40 rounded-full p-2.5 lg:hidden"
      >
        <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
          />
          <aside className="liquid-glass absolute inset-y-0 left-0 w-64 border-r border-[color:var(--border-hairline)]">
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
