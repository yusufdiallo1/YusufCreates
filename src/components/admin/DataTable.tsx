"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

/**
 * The admin table.
 *
 * Built once and used by every list. Before this, ten screens rendered ten
 * card lists: a list of the same object wants columns you can scan down and
 * sort, not a stack of cards you have to read individually. Cards survive only
 * where the content genuinely differs per item.
 *
 * MOBILE IS NOT A NARROWER TABLE. Below `sm` each row renders as a stacked
 * block of label/value pairs. A nine-column table cannot shrink to 390px —
 * it can only scroll sideways, which is how an admin becomes unusable on a
 * phone. The shape changes instead. This is the single most important
 * decision in this file.
 *
 * Destructive actions live in the ⋯ menu, last, after a divider. Nothing
 * destructive is a visible inline control: putting delete in the most
 * prominent position of every row is backwards.
 */

export interface Column<T> {
  /** Stable key, also used for sorting and column visibility. */
  id: string;
  header: string;
  /** What to draw in the cell. */
  cell: (row: T) => React.ReactNode;
  /**
   * Value used for sorting. Omit to make the column unsortable — which is
   * right for a column of buttons or a copy link.
   */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Hidden on narrow viewports in table mode. The stacked view shows all. */
  hideBelow?: "sm" | "md" | "lg";
  /** Right-align. For money and counts, which read better against a rule. */
  align?: "left" | "right";
  /** Kept out of the column-visibility menu — the row's identity column. */
  alwaysVisible?: boolean;
}

export interface RowAction<T> {
  label: string;
  onSelect: (row: T) => void;
  /** Renders in --danger, below a divider, at the end. */
  destructive?: boolean;
  /** Hide this action for rows it does not apply to. */
  show?: (row: T) => boolean;
}

type SortDir = "asc" | "desc";

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  actions,
  selectable = false,
  selected,
  onSelectedChange,
  empty,
  error,
  loading,
  caption,
}: {
  /** `undefined` means still loading — distinct from an empty array. */
  rows: T[] | undefined;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  actions?: RowAction<T>[];
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Shown when there are no rows. Carries its own primary action. */
  empty?: React.ReactNode;
  error?: string | null;
  loading?: boolean;
  /** Screen-reader description of what the table lists. */
  caption?: string;
}) {
  const [sort, setSort] = useState<{ id: string; dir: SortDir } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState(0);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const visible = columns.filter((c) => !hidden.has(c.id));

  /*
   * Sorting is client-side and stable.
   *
   * Every list query already returns its whole page in one go — none of them
   * paginate — so sorting on the server would be a round trip for data the
   * browser is holding. If a list ever grows past that, the sort moves down
   * with the pagination, not before.
   */
  const sorted = useMemo(() => {
    if (!rows || !sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      // Missing values sort last in both directions: a blank is not "smaller"
      // than a real value, it is absent, and burying it is what you want.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sort, columns]);

  const list = sorted ?? [];

  const cycleSort = (id: string) => {
    setSort((prev) => {
      if (prev?.id !== id) return { id, dir: "asc" };
      if (prev.dir === "asc") return { id, dir: "desc" };
      // Third press clears it, returning to the query's own order — which is
      // usually "newest first" and is a meaningful state to get back to.
      return null;
    });
  };

  const allSelected =
    selectable && list.length > 0 && list.every((r) => selected?.has(rowKey(r)));

  const toggleAll = () => {
    if (!onSelectedChange) return;
    onSelectedChange(allSelected ? new Set() : new Set(list.map(rowKey)));
  };

  const toggleOne = (key: string) => {
    if (!onSelectedChange || !selected) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectedChange(next);
  };

  /*
   * Keyboard: arrows move, Enter opens, Space selects.
   *
   * Bound on the tbody rather than per row so the handler count stays at one
   * regardless of row count, and so focus can move without every row needing
   * to be individually tabbable — which would make tabbing past a 50-row
   * table take 50 presses.
   */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (list.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = Math.min(list.length - 1, Math.max(0, focused + delta));
      setFocused(next);
      const el = bodyRef.current?.querySelectorAll("tr")[next];
      (el as HTMLElement | undefined)?.focus();
      return;
    }
    if (event.key === "Enter" && onRowClick) {
      event.preventDefault();
      onRowClick(list[focused]);
      return;
    }
    if (event.key === " " && selectable) {
      event.preventDefault();
      toggleOne(rowKey(list[focused]));
    }
  };

  if (error) {
    return (
      <div className="admin-card" role="alert">
        <p className="text-sm text-[color:var(--danger)]">{error}</p>
      </div>
    );
  }

  if (rows === undefined || loading) {
    return (
      <div className="space-y-1.5" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading…</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-surface-1"
            style={{ height: "var(--row-h)" }}
          />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="hairline rounded-xl px-6 py-12 text-center">
        {empty ?? <p className="text-sm text-secondary">Nothing here yet.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {columns.some((c) => !c.alwaysVisible) ? (
        <div className="flex justify-end">
          <ColumnToggle
            columns={columns}
            hidden={hidden}
            onChange={setHidden}
          />
        </div>
      ) : null}

      {/* ---------------------------------------------------------------
          Table, sm and up. overflow-x-auto on its own container so a wide
          table scrolls INSIDE the page rather than widening it.
          --------------------------------------------------------------- */}
      <div className="hairline hidden overflow-x-auto rounded-xl sm:block">
        <table className="w-full border-collapse text-[13px]">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            {/* Sticky so the headers survive a long list being scrolled. */}
            <tr className="sticky top-0 z-10 bg-[color:var(--bg-surface-1)]">
              {selectable ? (
                <th scope="col" className="w-10 px-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="size-3.5 rounded border-[color:var(--border-hairline)] bg-surface-1"
                  />
                </th>
              ) : null}

              {visible.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={`admin-meta border-b border-[color:var(--border-hairline)] px-3 py-2 whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${hideClass(col.hideBelow)}`}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => cycleSort(col.id)}
                      className="inline-flex items-center gap-1 transition-colors duration-fast hover:text-primary"
                      aria-label={`Sort by ${col.header}`}
                    >
                      {col.header}
                      <SortMark
                        active={sort?.id === col.id}
                        dir={sort?.id === col.id ? sort.dir : undefined}
                      />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}

              {actions?.length ? <th scope="col" className="w-10" /> : null}
            </tr>
          </thead>

          <tbody ref={bodyRef} onKeyDown={onKeyDown}>
            {list.map((row, index) => {
              const key = rowKey(row);
              const rowActions =
                actions?.filter((a) => !a.show || a.show(row)) ?? [];

              return (
                <tr
                  key={key}
                  tabIndex={index === focused ? 0 : -1}
                  onFocus={() => setFocused(index)}
                  onClick={() => onRowClick?.(row)}
                  aria-selected={selected?.has(key)}
                  className={`border-b border-[color:var(--border-hairline)] outline-none transition-colors duration-fast last:border-0 hover:bg-surface-2 focus-visible:bg-surface-2 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  style={{ height: "var(--row-h)" }}
                >
                  {selectable ? (
                    <td
                      className="px-3"
                      // Selecting must not also open the row.
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected?.has(key) ?? false}
                        onChange={() => toggleOne(key)}
                        aria-label="Select row"
                        className="size-3.5 rounded border-[color:var(--border-hairline)] bg-surface-1"
                      />
                    </td>
                  ) : null}

                  {visible.map((col) => (
                    <td
                      key={col.id}
                      className={`px-3 py-2 ${
                        col.align === "right"
                          ? "text-right tabular-nums"
                          : "text-left"
                      } ${hideClass(col.hideBelow)}`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}

                  {actions?.length ? (
                    <td className="px-1" onClick={(e) => e.stopPropagation()}>
                      <RowMenu row={row} actions={rowActions} />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------------------------------------------------------------
          Stacked, below sm. Same data, different shape.
          --------------------------------------------------------------- */}
      <ul className="space-y-1.5 sm:hidden">
        {list.map((row) => {
          const key = rowKey(row);
          const rowActions =
            actions?.filter((a) => !a.show || a.show(row)) ?? [];

          return (
            <li key={key} className="admin-card">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onRowClick?.(row)}
                  disabled={!onRowClick}
                  className="min-w-0 flex-1 space-y-1.5 text-left disabled:cursor-default"
                >
                  {/* Every column, since there is no width pressure here —
                      the row is as tall as it needs to be. */}
                  {columns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="admin-meta shrink-0">{col.header}</span>
                      <span className="min-w-0 text-right text-[13px]">
                        {col.cell(row)}
                      </span>
                    </div>
                  ))}
                </button>

                {rowActions.length ? (
                  <RowMenu row={row} actions={rowActions} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ menu --- */

function RowMenu<T>({ row, actions }: { row: T; actions: RowAction<T>[] }) {
  if (actions.length === 0) return null;

  const safe = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Row actions"
          /* 44px target even in compact density — this is the one control on
             the row that has to be hittable with a thumb. */
          className="flex size-9 items-center justify-center rounded-lg text-secondary transition-colors duration-fast hover:bg-surface-3 hover:text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="3" cy="8" r="1.4" fill="currentColor" />
            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
            <circle cx="13" cy="8" r="1.4" fill="currentColor" />
          </svg>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="hairline z-50 min-w-44 rounded-lg bg-[color:var(--bg-surface-2)] p-1 shadow-lg"
        >
          {safe.map((action) => (
            <DropdownMenu.Item
              key={action.label}
              onSelect={() => action.onSelect(row)}
              className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-primary outline-none data-[highlighted]:bg-surface-3"
            >
              {action.label}
            </DropdownMenu.Item>
          ))}

          {destructive.length && safe.length ? (
            <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-hairline)]" />
          ) : null}

          {destructive.map((action) => (
            <DropdownMenu.Item
              key={action.label}
              onSelect={() => action.onSelect(row)}
              className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-[color:var(--danger)] outline-none data-[highlighted]:bg-surface-3"
            >
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* --------------------------------------------------------------- columns --- */

function ColumnToggle<T>({
  columns,
  hidden,
  onChange,
}: {
  columns: Column<T>[];
  hidden: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="admin-meta hidden items-center gap-1.5 rounded-lg px-2 py-1 transition-colors duration-fast hover:text-primary sm:inline-flex"
        >
          Columns
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="hairline z-50 min-w-44 rounded-lg bg-[color:var(--bg-surface-2)] p-1 shadow-lg"
        >
          {columns
            .filter((c) => !c.alwaysVisible)
            .map((col) => (
              <DropdownMenu.CheckboxItem
                key={col.id}
                checked={!hidden.has(col.id)}
                onCheckedChange={(on) => {
                  const next = new Set(hidden);
                  if (on) next.delete(col.id);
                  else next.add(col.id);
                  onChange(next);
                }}
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-primary outline-none data-[highlighted]:bg-surface-3"
              >
                <span className="mr-2 inline-block w-3">
                  {hidden.has(col.id) ? "" : "✓"}
                </span>
                {col.header}
              </DropdownMenu.CheckboxItem>
            ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SortMark({ active, dir }: { active: boolean; dir?: SortDir }) {
  if (!active) {
    return (
      <span aria-hidden="true" className="opacity-0 transition-opacity group-hover:opacity-100">
        ↕
      </span>
    );
  }
  return <span aria-hidden="true">{dir === "asc" ? "↑" : "↓"}</span>;
}

function hideClass(below: Column<unknown>["hideBelow"]): string {
  if (below === "md") return "hidden md:table-cell";
  if (below === "lg") return "hidden lg:table-cell";
  return "";
}
