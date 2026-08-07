"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { ADMIN_PATH } from "@/lib/constants";

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

  /*
   * ⌘K toggles, Escape closes.
   *
   * Escape used to be missing entirely. This is a bare <Command> with a
   * hand-rolled overlay rather than <Command.Dialog>, and cmdk's own root
   * keydown handler only implements the navigation keys — Escape is handled by
   * the Radix Dialog that Command.Dialog wraps, which is not in this tree. So
   * nothing anywhere was listening for it, while the panel rendered an "esc"
   * hint promising that it was.
   *
   * capture phase, so it fires before cmdk's own handler and before anything
   * inside the palette can swallow it.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // metaKey for macOS, ctrlKey elsewhere.
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
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
      { id: "nav:overview", label: "Overview", group: "Go to", run: () => go(`${ADMIN_PATH}`) },
      /* One entry, not two. "Leads" and "Clients" were separate destinations
         until they were merged onto one screen; leaving both here would list
         the same page twice under different names. The old vocabulary lives on
         as keywords so typing "leads" still finds it. */
      { id: "nav:clients", label: "Requests and clients", group: "Go to", keywords: "inbox enquiries leads clients portal access", run: () => go(`${ADMIN_PATH}/clients`) },
      { id: "nav:analytics", label: "Analytics", group: "Go to", keywords: "traffic stats", run: () => go(`${ADMIN_PATH}/analytics`) },
      { id: "nav:content", label: "Content — portfolio, blog, testimonials", group: "Go to", keywords: "work portfolio posts writing quotes", run: () => go(`${ADMIN_PATH}/content`) },
      { id: "nav:feedback", label: "Feedback", group: "Go to", run: () => go(`${ADMIN_PATH}/feedback`) },
      { id: "nav:broadcasts", label: "Broadcasting", group: "Go to", keywords: "newsletter email send", run: () => go(`${ADMIN_PATH}/broadcasts`) },
      { id: "nav:kb", label: "AI assistant and chat logs", group: "Go to", keywords: "bot chat questions knowledge kb conversations", run: () => go(`${ADMIN_PATH}/kb`) },
      { id: "nav:invoices", label: "Proposals and invoices", group: "Go to", keywords: "money billing vat", run: () => go(`${ADMIN_PATH}/invoices`) },
      { id: "nav:promos", label: "Promotions", group: "Go to", keywords: "discount code sale offer", run: () => go(`${ADMIN_PATH}/promos`) },
      { id: "nav:proposals", label: "Proposals", group: "Go to", keywords: "quote scope contract", run: () => go(`${ADMIN_PATH}/proposals`) },
      { id: "nav:settings", label: "Settings", group: "Go to", keywords: "profile availability config", run: () => go(`${ADMIN_PATH}/settings`) },
    ];

    const quick: Action[] = [
      // /broadcasts, not /broadcasts/new — there is no route at the latter,
      // so the one shortcut for the action 404'd. The composer is on the
      // index page itself.
      { id: "do:broadcast", label: "Start a broadcast", hint: "Compose a newsletter", group: "Actions", run: () => go(`${ADMIN_PATH}/broadcasts`) },
      { id: "do:site", label: "View the live site", group: "Actions", keywords: "public home", run: () => { setOpen(false); window.open("/", "_blank", "noopener"); } },
    ];

    const leadActions: Action[] =
      data?.leads.map((l) => ({
        id: `lead:${l._id}`,
        label: l.name || l.email,
        hint: [l.company, l.email].filter(Boolean).join(" · "),
        group: "Leads",
        keywords: `${l.company ?? ""} ${l.email}`,
        run: () => go(`${ADMIN_PATH}/clients?id=${l._id}`),
      })) ?? [];

    const projectActions: Action[] =
      data?.projects.map((p) => ({
        id: `project:${p._id}`,
        label: p.title,
        hint: p.status,
        group: "Projects",
        keywords: p.slug,
        run: () => go(`${ADMIN_PATH}/content`),
      })) ?? [];

    /*
     * Clients, invoices and proposals joined the palette.
     *
     * Before this, finding an invoice meant knowing it was on the invoices
     * screen, going there, and reading the list. Searching across every
     * entity from one box is the difference between a shortcut and the way
     * you actually move around the admin.
     *
     * Each group carries the fields you would search BY as keywords — an
     * invoice by client name as well as its reference, a client by email —
     * because nobody remembers a reference number.
     */
    const clientActions: Action[] =
      data?.clients.map((c) => ({
        id: `client:${c._id}`,
        label: c.name || c.email,
        hint: [c.company, c.email].filter(Boolean).join(" · "),
        group: "Clients",
        keywords: `${c.company ?? ""} ${c.email}`,
        run: () => go(`${ADMIN_PATH}/clients`),
      })) ?? [];

    const money = (n: number, currency: string) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0,
      }).format(n);

    const invoiceActions: Action[] =
      data?.invoices.map((i) => ({
        id: `invoice:${i._id}`,
        label: `${i.reference} · ${i.clientName}`,
        hint: `${money(i.amount, i.currency)} · ${i.status}`,
        group: "Invoices",
        keywords: `${i.clientName} ${i.status}`,
        run: () => go(`${ADMIN_PATH}/invoices?q=${encodeURIComponent(i.reference)}`),
      })) ?? [];

    const proposalActions: Action[] =
      data?.proposals.map((p) => ({
        id: `proposal:${p._id}`,
        label: p.clientName ?? "Untitled proposal",
        hint: `${money(p.amount, p.currency)} · ${p.status}`,
        group: "Proposals",
        keywords: p.status,
        run: () =>
          go(
            `${ADMIN_PATH}/proposals${
              p.clientName ? `?q=${encodeURIComponent(p.clientName)}` : ""
            }`,
          ),
      })) ?? [];

    return [
      ...nav,
      ...quick,
      ...leadActions,
      ...clientActions,
      ...invoiceActions,
      ...proposalActions,
      ...projectActions,
    ];
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
    >
      {/*
        The backdrop is its own click target.

        It used to be an `aria-hidden` div layered under a container that
        carried `onMouseDown={e => e.target === e.currentTarget && close()}`.
        That test could never pass: this div covers the whole container, so a
        click on the dim area always landed on IT, never on the container, and
        e.target !== e.currentTarget every single time. Clicking outside the
        palette did nothing at all.

        Putting the handler on the element the pointer actually hits removes
        the ambiguity — no target comparison, no guessing what counts as
        "outside".
      */}
      <div
        aria-hidden="true"
        onMouseDown={() => setOpen(false)}
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
