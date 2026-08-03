"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

/**
 * The toolbar above every admin table.
 *
 * Search, facets, a result count and CSV export. Every list in the admin was
 * unfiltered — fine at three rows, unusable at fifty, and every one of them
 * will get to fifty.
 *
 * State lives in the URL query string, so a filtered view can be bookmarked,
 * shared, and survives a refresh. That also means the filter state is the
 * page's address rather than a second source of truth held in component
 * state — there is nothing to keep in sync.
 */

export interface Facet {
  /** Query-string key. Also the label when no `label` is given. */
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

export function useTableFilters(facetIds: string[]) {
  const router = useRouter();
  const params = useSearchParams();

  const search = params.get("q") ?? "";
  const filters: Record<string, string> = {};
  for (const id of facetIds) {
    const value = params.get(id);
    if (value) filters[id] = value;
  }

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    /*
     * replace, not push: typing in a search box should not put one history
     * entry per keystroke between you and the page you came from.
     * scroll:false so refining a filter does not jump you to the top.
     */
    router.replace(next.toString() ? `?${next.toString()}` : "?", {
      scroll: false,
    });
  };

  return { search, filters, setParam };
}

export function TableToolbar({
  search,
  onSearch,
  placeholder = "Search…",
  facets = [],
  filters,
  onFilter,
  shown,
  total,
  onExport,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  facets?: Facet[];
  filters: Record<string, string>;
  onFilter: (id: string, value: string | null) => void;
  shown: number;
  total: number;
  onExport?: () => void;
  /** Extra controls, e.g. the page's primary action. */
  children?: React.ReactNode;
}) {
  /*
   * Debounced 200ms.
   *
   * The input is uncontrolled-ish: it holds its own value so typing is never
   * laggy, and pushes to the URL once you pause. Driving it straight from the
   * query string would re-render the whole list on every keystroke.
   */
  const [draft, setDraft] = useState(search);

  useEffect(() => {
    setDraft(search);
  }, [search]);

  useEffect(() => {
    if (draft === search) return;
    const id = setTimeout(() => onSearch(draft), 200);
    return () => clearTimeout(id);
  }, [draft, search, onSearch]);

  const active = Object.entries(filters).filter(([, v]) => v);

  return (
    <div className="space-y-2">
      {/* Wraps rather than scrolls: on a phone this becomes two or three
          rows, all of them reachable. */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="hairline flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-1 px-3 sm:max-w-xs">
          <SearchIcon />
          <span className="sr-only">{placeholder}</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            /* text-base on mobile: anything smaller makes iOS zoom the whole
               page on focus, which then has to be pinched back out. */
            className="min-w-0 flex-1 bg-transparent text-base text-primary outline-none placeholder:text-secondary sm:text-[13px]"
          />
          {draft ? (
            <button
              type="button"
              onClick={() => setDraft("")}
              aria-label="Clear search"
              className="text-secondary transition-colors duration-fast hover:text-primary"
            >
              ×
            </button>
          ) : null}
        </label>

        {facets.length ? (
          <FilterMenu facets={facets} filters={filters} onFilter={onFilter} />
        ) : null}

        <span className="admin-meta ml-auto whitespace-nowrap">
          {shown === total ? `${total}` : `${shown} of ${total}`}
        </span>

        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            className="admin-meta rounded-lg px-2 py-1 transition-colors duration-fast hover:text-primary"
          >
            Export
          </button>
        ) : null}

        {children}
      </div>

      {/* Active filters as chips, each individually clearable. Without these
          a filtered view looks identical to an empty table. */}
      {active.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map(([id, value]) => {
            const facet = facets.find((f) => f.id === id);
            const label =
              facet?.options.find((o) => o.value === value)?.label ?? value;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onFilter(id, null)}
                className="hairline inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
              >
                <span className="text-secondary">{facet?.label ?? id}:</span>
                {label}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Clear this filter</span>
              </button>
            );
          })}
          {active.length > 1 ? (
            <button
              type="button"
              onClick={() => active.forEach(([id]) => onFilter(id, null))}
              className="px-2 py-1 text-xs text-secondary transition-colors duration-fast hover:text-primary"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterMenu({
  facets,
  filters,
  onFilter,
}: {
  facets: Facet[];
  filters: Record<string, string>;
  onFilter: (id: string, value: string | null) => void;
}) {
  const count = Object.values(filters).filter(Boolean).length;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="hairline flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] text-secondary transition-colors duration-fast hover:text-primary"
        >
          Filters
          {count ? (
            <span className="rounded-full bg-surface-3 px-1.5 text-[11px] text-primary tabular-nums">
              {count}
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="hairline z-50 max-h-[70vh] min-w-52 overflow-y-auto rounded-lg bg-[color:var(--bg-surface-2)] p-1 shadow-lg"
        >
          {facets.map((facet, i) => (
            <div key={facet.id}>
              {i > 0 ? (
                <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-hairline)]" />
              ) : null}
              <DropdownMenu.Label className="admin-meta px-2.5 py-1.5">
                {facet.label}
              </DropdownMenu.Label>
              {facet.options.map((option) => (
                <DropdownMenu.CheckboxItem
                  key={option.value}
                  checked={filters[facet.id] === option.value}
                  onCheckedChange={(on) =>
                    onFilter(facet.id, on ? option.value : null)
                  }
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer rounded-md px-2.5 py-2 text-[13px] text-primary outline-none data-[highlighted]:bg-surface-3"
                >
                  <span className="mr-2 inline-block w-3">
                    {filters[facet.id] === option.value ? "✓" : ""}
                  </span>
                  {option.label}
                </DropdownMenu.CheckboxItem>
              ))}
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * CSV from flat rows.
 *
 * Hand-rolled rather than adding a dependency: the admin exports flat records
 * of strings and numbers, which is the case a CSV library exists to make
 * unnecessary. Quotes are doubled and any field containing a comma, a quote or
 * a newline is wrapped — that is the whole of RFC 4180 that applies here.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const escape = (value: string | number | null | undefined) => {
    const s = value == null ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  /* A BOM, so Excel opens UTF-8 correctly instead of mangling every accented
     name in the file. */
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-secondary"
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.5 10.5L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
