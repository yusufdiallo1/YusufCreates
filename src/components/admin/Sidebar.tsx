"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Logo } from "@/components/ui/Logo";
import { ADMIN_PATH } from "@/lib/constants";

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

/**
 * Navigation.
 *
 * Three groups, not four, and the two screens I open every day sit at the top
 * outside any group. Fourteen links under four headings read as a directory;
 * this reads as a tool. Everything still reachable is still reachable —
 * anything not here is one Cmd+K away.
 */
const PRIMARY = [
  { href: `${ADMIN_PATH}`, label: "Overview" },
  { href: `${ADMIN_PATH}/leads`, label: "Leads" },
];

const GROUPS: { heading: string; items: { href: string; label: string }[] }[] = [
  {
    heading: "Clients",
    items: [
      { href: `${ADMIN_PATH}/clients`, label: "Clients & projects" },
      { href: `${ADMIN_PATH}/proposals`, label: "Proposals" },
      { href: `${ADMIN_PATH}/invoices`, label: "Invoices" },
    ],
  },
  {
    heading: "Site",
    items: [
      { href: `${ADMIN_PATH}/projects`, label: "Portfolio" },
      { href: `${ADMIN_PATH}/blog`, label: "Blog" },
      { href: `${ADMIN_PATH}/testimonials`, label: "Testimonials" },
    ],
  },
  {
    heading: "Growth",
    items: [
      { href: `${ADMIN_PATH}/broadcasts`, label: "Broadcast" },
      { href: `${ADMIN_PATH}/promos`, label: "Promotions" },
      { href: `${ADMIN_PATH}/analytics`, label: "Analytics" },
      { href: `${ADMIN_PATH}/kb`, label: "AI knowledge" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { signOut } = useAuthActions();

  /**
   * Ends the session and returns to the public site.
   *
   * router.replace, not push: the admin must not sit in history where the back
   * button would return to a page whose data is already gone. Convex clears the
   * session token, so coming back to /admin hits the middleware redirect and
   * requires signing in again.
   */
  async function endSession() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } finally {
      setSigningOut(false);
      setConfirmingSignOut(false);
    }
  }

  // Exact match for the index, prefix match elsewhere — otherwise /admin
  // would stay highlighted on every child route.
  const isActive = (href: string) =>
    href === `${ADMIN_PATH}` ? pathname === `${ADMIN_PATH}` : pathname.startsWith(href);

  const nav = (
    <nav aria-label="Admin sections" className="flex h-full flex-col">
      {/* Inside the admin the logo signs you out rather than navigating home.
          Everywhere else on the site it still goes to the landing page.

          A confirm dialog, not SlideToConfirm: signing out is reversible — you
          can sign straight back in — so the gesture would be friction spent
          where it does not belong. But it is destructive enough to unsaved
          work that it should not fire on a stray click. */}
      <button
        type="button"
        onClick={() => setConfirmingSignOut(true)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-5 text-left transition-colors duration-fast hover:bg-surface-2"
        aria-label="Sign out of the admin"
      >
        <Logo variant="mark" className="h-6 w-auto" />
        <span className="text-sm text-primary">Admin</span>
      </button>

      <div className="flex-1 space-y-6 overflow-y-auto px-1 pb-4">
        {/* Ungrouped and first: the two screens opened every day should not
            be buried under a heading with everything else. */}
        <ul>
          {PRIMARY.map((item) => (
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

      <div className="space-y-1 px-1 py-3 before:mb-3 before:block before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/8 before:to-transparent">
        <Link
          href={`${ADMIN_PATH}/feedback`}
          aria-current={isActive(`${ADMIN_PATH}/feedback`) ? "page" : undefined}
          onClick={() => setMobileOpen(false)}
          className="admin-nav-link"
        >
          Feedback
        </Link>
        <Link
          href={`${ADMIN_PATH}/settings`}
          aria-current={isActive(`${ADMIN_PATH}/settings`) ? "page" : undefined}
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
          onClick={() => setConfirmingSignOut(true)}
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
      <aside className="glass-depth glass-mid fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
        {nav}
      </aside>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open admin navigation"
        aria-expanded={mobileOpen}
        className="glass-depth glass-near glass-pill fixed top-4 left-4 z-40 p-2.5 lg:hidden"
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

      {confirmingSignOut ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setConfirmingSignOut(false)}
            className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            className="glass-depth glass-near glass-panel relative w-full max-w-xs p-6 text-center"
          >
            <h2 id="signout-title" className="text-lg text-primary">
              Sign out?
            </h2>
            <p className="mt-2 text-sm text-secondary">
              You&apos;ll need your password to get back in.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                autoFocus
                disabled={signingOut}
                onClick={() => void endSession()}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingSignOut(false)}
                className="rounded-full px-5 py-2.5 text-sm text-secondary transition-colors duration-fast hover:text-primary"
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
          />
          <aside className="glass-depth glass-near absolute inset-y-0 left-0 w-64">
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
