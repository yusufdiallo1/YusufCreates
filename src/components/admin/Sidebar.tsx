"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Reorder, useDragControls } from "motion/react";
import { Logo } from "@/components/ui/Logo";
import { ADMIN_PATH } from "@/lib/constants";
import {
  applyOrder,
  getNavOrderServerSnapshot,
  getNavOrderSnapshot,
  resetNavOrder,
  setSectionOrder,
  subscribeNavOrder,
} from "@/lib/nav-order";

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
 * Four groups, and the two screens I open every day sit at the top outside
 * any group.
 *
 * The fourth — TOOLS — was previously an unlabelled block of five links
 * below a separator, which read as leftovers rather than as a section. Giving
 * it a heading costs one line and makes the sidebar four labelled groups
 * instead of three plus a remainder. The waitlist joined it at the same time:
 * it had a page and no way to reach it except by typing the URL.
 */
const PRIMARY = [
  { href: `${ADMIN_PATH}`, label: "Overview" },
  /* "Leads" is gone: it and Clients were the same person on two screens, and
     the decision that turns one into the other had nowhere to live. Clients is
     now the whole arc — undecided requests, active clients, full archive — and
     ${ADMIN_PATH}/leads redirects here. */
  { href: `${ADMIN_PATH}/clients`, label: "Clients" },
];

const GROUPS: { heading: string; items: { href: string; label: string }[] }[] = [
  {
    heading: "Clients",
    items: [
      { href: `${ADMIN_PATH}/proposals`, label: "Proposals" },
      { href: `${ADMIN_PATH}/invoices`, label: "Invoices" },
    ],
  },
  {
    heading: "Site",
    // Portfolio, blog and testimonials are one page with tabs. Three entries
    // made the admin look like it had more to run than it does, and none of
    // them is a daily job.
    items: [{ href: `${ADMIN_PATH}/content`, label: "Content" }],
  },
  {
    heading: "Growth",
    items: [
      { href: `${ADMIN_PATH}/broadcasts`, label: "Broadcast" },
      { href: `${ADMIN_PATH}/subscribers`, label: "Subscribers" },
      { href: `${ADMIN_PATH}/promos`, label: "Promotions" },
      { href: `${ADMIN_PATH}/analytics`, label: "Analytics" },
      { href: `${ADMIN_PATH}/kb`, label: "AI" },
    ],
  },
  {
    /*
     * Was an unlabelled block below a separator. Five destinations with no
     * heading read as leftovers rather than as a section — and the waitlist
     * was not in the sidebar at all, reachable only by typing the URL.
     *
     * "Express", not "Express builds": the sidebar, the breadcrumb and the
     * page title each called this something different.
     */
    heading: "Tools",
    items: [
      { href: `${ADMIN_PATH}/express`, label: "Express" },
      { href: `${ADMIN_PATH}/waitlist`, label: "Waitlist" },
      { href: `${ADMIN_PATH}/audits`, label: "Site audits" },
      { href: `${ADMIN_PATH}/feedback`, label: "Feedback" },
      { href: `${ADMIN_PATH}/settings`, label: "Settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(false);
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
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-3.5 text-left transition-colors duration-hover ease-hover hover:bg-surface-2"
        aria-label="Sign out of the admin"
      >
        <Logo variant="mark" className="h-6 w-auto" />
        <span className="text-sm text-primary">Admin</span>
      </button>

      <div className="flex-1 space-y-4 overflow-y-auto px-1 pb-4">
        {/* Ungrouped and first: the two screens opened every day should not
            be buried under a heading with everything else. */}
        <NavSection
          section="primary"
          items={PRIMARY}
          editing={editingOrder}
          isActive={isActive}
          onNavigate={() => setMobileOpen(false)}
        />

        {GROUPS.map((group) => (
          <div key={group.heading}>
            <h2 className="px-3 pb-1.5 text-[11px] tracking-[0.04em] text-secondary uppercase">
              {group.heading}
            </h2>
            <NavSection
              section={group.heading}
              items={group.items}
              editing={editingOrder}
              isActive={isActive}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        ))}
      </div>

      {/*
        Reordering is an explicit MODE, not something drag-enabled all the time.

        These are links clicked dozens of times a day. If every one of them
        were permanently draggable, a slightly-dragged click would reorder the
        sidebar instead of navigating — a destructive surprise on the control
        you use most. Behind a toggle, dragging is only possible when it is
        what you asked for.
      */}
      <div className="hairline-t mt-auto px-1 pt-2 pb-1">
        <button
          type="button"
          onClick={() => setEditingOrder((v) => !v)}
          aria-pressed={editingOrder}
          className="admin-nav-link w-full justify-between text-[11px]"
        >
          <span>{editingOrder ? "Done reordering" : "Reorder menu"}</span>
          {editingOrder ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                resetNavOrder();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  resetNavOrder();
                }
              }}
              className="text-accent hover:text-primary"
            >
              Reset
            </span>
          ) : null}
        </button>
      </div>

      {/*
        Only the two links that leave the admin stay unlabelled down here.
        Express, audits, feedback, settings and the waitlist used to sit in
        this same ungrouped block — five real destinations with no heading,
        below a separator, reading as an afterthought. They are now the TOOLS
        group above, alongside CLIENTS, SITE and GROWTH.
      */}
      <div className="space-y-1 px-1 py-3 before:mb-3 before:block before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/8 before:to-transparent">
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
      {/*
        Desktop: always present, never collapses. An admin that hides its own
        navigation to save 240px is optimising the wrong thing.

        PART OF THE WINDOW, NOT FLOATING ABOVE IT. This was `glass-depth
        glass-mid` — a translucent panel with its own shadow stack, hovering
        over the content as if it were a modal. A permanent, full-height
        navigation column is structure, not an overlay: it never moves, nothing
        passes under it, and the depth cues were spent implying otherwise.

        So it is flush to the frame, opaque on --bg-surface-1 against the
        --bg-canvas content pane, and divided from that pane by a single
        separator. Depth comes from the surface step; structure comes from the
        line. Nothing else is needed and anything else is noise.
      */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-[color:var(--separator)] bg-surface-1 lg:block">
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
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingSignOut(false)}
                className="rounded-full px-5 py-2.5 text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
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

type NavItem = { href: string; label: string };

/**
 * One list of nav links, reorderable in place.
 *
 * ACCESSIBILITY IS THE REASON THIS IS NOT JUST A DRAG TARGET. Dragging is a
 * pointer gesture; a keyboard user cannot perform it at all, and on a phone it
 * competes with scrolling. So while reordering is active every row also gets
 * explicit up/down buttons, and the same move can be made with Alt+Arrow from
 * the row itself. Drag is the fast path, not the only path.
 *
 * Rendered as a plain <ul> when not editing, so the normal sidebar carries no
 * drag listeners, no motion values and no extra DOM at all — this is the
 * component the admin looks at all day, and reordering is a rare act.
 */
function NavSection({
  section,
  items,
  editing,
  isActive,
  onNavigate,
}: {
  section: string;
  items: readonly NavItem[];
  editing: boolean;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  const order = useSyncExternalStore(
    subscribeNavOrder,
    getNavOrderSnapshot,
    getNavOrderServerSnapshot,
  );
  const ordered = applyOrder(items, order[section]);

  if (!editing) {
    return (
      <ul>
        {ordered.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={onNavigate}
              className="admin-nav-link"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSectionOrder(section, next.map((i) => i.href));
  };

  return (
    <Reorder.Group
      axis="y"
      values={ordered}
      onReorder={(next: NavItem[]) =>
        setSectionOrder(section, next.map((i) => i.href))
      }
      as="ul"
    >
      {ordered.map((item, index) => (
        <NavSectionItem
          key={item.href}
          item={item}
          index={index}
          total={ordered.length}
          onMove={move}
        />
      ))}
    </Reorder.Group>
  );
}

function NavSectionItem({
  item,
  index,
  total,
  onMove,
}: {
  item: NavItem;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) {
  /*
   * dragListeners: false plus explicit controls, so ONLY the grip starts a
   * drag. With listeners on the whole row, pressing anywhere — including on
   * the up/down buttons — begins a drag, and the buttons stop working.
   */
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      as="li"
      className="admin-nav-link cursor-default justify-between gap-1"
      onKeyDown={(e: React.KeyboardEvent) => {
        // Alt+Arrow, not bare Arrow: bare arrows must keep scrolling the
        // sidebar and moving between rows.
        if (!e.altKey) return;
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onMove(index, index - 1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onMove(index, index + 1);
        }
      }}
      tabIndex={0}
      aria-label={`${item.label}, position ${index + 1} of ${total}. Alt plus arrow keys to move.`}
    >
      <span
        aria-hidden="true"
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-muted select-none active:cursor-grabbing"
        title="Drag to reorder"
      >
        ⠿
      </span>

      <span className="min-w-0 flex-1 truncate">{item.label}</span>

      <span className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          aria-label={`Move ${item.label} up`}
          className="px-1 text-muted hover:text-primary disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index + 1)}
          disabled={index === total - 1}
          aria-label={`Move ${item.label} down`}
          className="px-1 text-muted hover:text-primary disabled:opacity-30"
        >
          ↓
        </button>
      </span>
    </Reorder.Item>
  );
}
