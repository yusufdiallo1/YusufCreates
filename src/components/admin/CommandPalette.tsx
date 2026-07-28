"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";

/**
 * Command palette. Cmd+K anywhere in the admin.
 *
 * This is the primary navigation, not a shortcut bolted onto one — every
 * section is reachable from here without touching the sidebar, which is what
 * makes an admin feel like a tool rather than a website.
 *
 * Three things earn their complexity:
 *
 * 1. Recents float to the top, persisted in localStorage. The action you want
 *    next is overwhelmingly the one you took last, and re-typing it every
 *    time is the difference between a palette people use and one they forget.
 * 2. Leads are searchable by name, company and email. Finding a person is the
 *    most common reason to open this at all.
 * 3. Fully keyboard operable, which cmdk gives us — arrows move, enter runs,
 *    escape closes, and focus returns to whatever opened it.
 */

const RECENTS_KEY = "yc.palette.recents";
const MAX_RECENTS = 5;

interface Action {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
  keywords?: string;
}

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    // Corrupt or unavailable storage must never break the palette.
    return [];
  }
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState<string[]>([]);

  const data = useQuery(api.admin.paletteData, open ? {} : "skip");

  // Read storage on first open rather than in an effect on mount. Doing it
  // during render would mismatch the server-rendered HTML; doing it in a
  // mount effect is a setState-in-effect cascade for a value nothing needs
  // until the palette is actually visible.
  const [recentsLoaded, setRecentsLoaded] = useState(false);
  if (open && !recentsLoaded) {
    setRecentsLoaded(true);
    setRecents(loadRecents());
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // metaKey for macOS, ctrlKey elsewhere.
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const remember = useCallback((id: string) => {
    setRecents((prev) => {
      const next = [id, ...prev.filter((r) => r !== id)].slice(0, MAX_RECENTS);
      try {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        // Private browsing can refuse writes; the palette still works.
      }
      return next;
    });
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setSearch("");
      router.push(href);
    },
    [router],
  );

  const actions = useMemo<Action[]>(() => {
    const nav: Action[] = [
      { id: "nav:overview", label: "Overview", group: "Go to", run: () => go("/admin") },
      { id: "nav:leads", label: "Leads and inquiries", group: "Go to", keywords: "inbox enquiries", run: () => go("/admin/leads") },
      { id: "nav:analytics", label: "Analytics", group: "Go to", keywords: "traffic stats", run: () => go("/admin/analytics") },
      { id: "nav:projects", label: "Projects and case studies", group: "Go to", keywords: "work portfolio", run: () => go("/admin/projects") },
      { id: "nav:testimonials", label: "Testimonials", group: "Go to", run: () => go("/admin/testimonials") },
      { id: "nav:feedback", label: "Feedback", group: "Go to", run: () => go("/admin/feedback") },
      { id: "nav:broadcasts", label: "Broadcasting", group: "Go to", keywords: "newsletter email send", run: () => go("/admin/broadcasts") },
      { id: "nav:blog", label: "Blog", group: "Go to", keywords: "posts writing", run: () => go("/admin/blog") },
      { id: "nav:kb", label: "AI knowledge base", group: "Go to", keywords: "bot chat questions", run: () => go("/admin/kb") },
      { id: "nav:invoices", label: "Proposals and invoices", group: "Go to", keywords: "money billing vat", run: () => go("/admin/invoices") },
      { id: "nav:promos", label: "Promotions", group: "Go to", keywords: "discount code sale offer", run: () => go("/admin/promos") },
      { id: "nav:clients", label: "Clients", group: "Go to", keywords: "portal access", run: () => go("/admin/clients") },
      { id: "nav:settings", label: "Settings", group: "Go to", keywords: "profile availability config", run: () => go("/admin/settings") },
    ];

    const quick: Action[] = [
      { id: "do:broadcast", label: "Start a broadcast", hint: "Compose a newsletter", group: "Actions", run: () => go("/admin/broadcasts/new") },
      { id: "do:project", label: "New project", group: "Actions", run: () => go("/admin/projects/new") },
      { id: "do:post", label: "New blog post", group: "Actions", run: () => go("/admin/blog/new") },
      { id: "do:site", label: "View the live site", group: "Actions", keywords: "public home", run: () => { setOpen(false); window.open("/", "_blank", "noopener"); } },
    ];

    const leadActions: Action[] =
      data?.leads.map((l) => ({
        id: `lead:${l._id}`,
        label: l.name || l.email,
        hint: [l.company, l.email].filter(Boolean).join(" · "),
        group: "Leads",
        keywords: `${l.company ?? ""} ${l.email}`,
        run: () => go(`/admin/leads?id=${l._id}`),
      })) ?? [];

    const projectActions: Action[] =
      data?.projects.map((p) => ({
        id: `project:${p._id}`,
        label: p.title,
        hint: p.status,
        group: "Projects",
        keywords: p.slug,
        run: () => go(`/admin/projects/${p._id}`),
      })) ?? [];

    return [...nav, ...quick, ...leadActions, ...projectActions];
  }, [data, go]);

  const byId = useMemo(
    () => new Map(actions.map((a) => [a.id, a])),
    [actions],
  );

  // Recents only lead when there is no query — once you start typing, the
  // ranking should follow what you typed, not what you did yesterday.
  // Memoised so the identity is stable; a fresh array every render would
  // invalidate `grouped` on every keystroke.
  const recentActions = useMemo(
    () =>
      search.trim() === ""
        ? recents
            .map((id) => byId.get(id))
            .filter((a): a is Action => Boolean(a))
        : [],
    [search, recents, byId],
  );

  const grouped = useMemo(() => {
    const recentIds = new Set(recentActions.map((r) => r.id));
    const map = new Map<string, Action[]>();
    for (const a of actions) {
      if (recentIds.has(a.id)) continue;
      const list = map.get(a.group) ?? [];
      list.push(a);
      map.set(a.group, list);
    }
    return [...map.entries()];
  }, [actions, recentActions]);

  const runAction = (a: Action) => {
    remember(a.id);
    a.run();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      role="presentation"
      onMouseDown={(e) => {
        // Backdrop click closes; clicks inside the panel must not.
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />

      <Command
        label="Command palette"
        loop
        className="glass-depth glass-near glass-panel relative w-full max-w-xl overflow-hidden p-0"
        // cmdk filters with its own fuzzy matcher over value + keywords.
        shouldFilter
      >
        <div className="flex items-center gap-3 px-5 after:pointer-events-none after:absolute after:inset-x-0 after:top-[57px] after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/8 after:to-transparent">
          <SearchIcon />
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder="Search or jump to…"
            className="w-full bg-transparent py-4 text-sm text-primary outline-none placeholder:text-secondary"
          />
          <kbd className="hidden shrink-0 rounded border border-[color:var(--border-hairline)] px-1.5 py-0.5 text-[10px] text-secondary sm:block">
            esc
          </kbd>
        </div>

        <Command.List className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
          <Command.Empty className="px-3 py-8 text-center text-sm text-secondary">
            Nothing matches that.
          </Command.Empty>

          {recentActions.length > 0 ? (
            <Command.Group heading="Recent" className="palette-group">
              {recentActions.map((a) => (
                <Item key={a.id} action={a} onRun={runAction} />
              ))}
            </Command.Group>
          ) : null}

          {grouped.map(([group, items]) => (
            <Command.Group key={group} heading={group} className="palette-group">
              {items.map((a) => (
                <Item key={a.id} action={a} onRun={runAction} />
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}

function Item({
  action,
  onRun,
}: {
  action: Action;
  onRun: (a: Action) => void;
}) {
  return (
    <Command.Item
      value={`${action.label} ${action.keywords ?? ""}`}
      onSelect={() => onRun(action)}
      className="palette-item flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-sm"
    >
      <span className="truncate text-primary">{action.label}</span>
      {action.hint ? (
        <span className="shrink-0 truncate text-xs text-secondary">
          {action.hint}
        </span>
      ) : null}
    </Command.Item>
  );
}

function SearchIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-secondary"
    >
      <circle cx={7} cy={7} r={4.5} stroke="currentColor" strokeWidth={1.5} />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
