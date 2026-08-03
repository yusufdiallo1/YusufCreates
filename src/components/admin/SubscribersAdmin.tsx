"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import {
  TableToolbar,
  downloadCsv,
  useTableFilters,
} from "@/components/admin/TableToolbar";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * The mailing list.
 *
 * `subscribers.list` has existed since the newsletter shipped and nothing in
 * the admin ever read it — the only consumer was the broadcast composer's
 * audience count, so the list itself was write-only. You could see that
 * fourteen people had subscribed and never who they were, or whether a
 * confirmation had actually landed.
 */
export function SubscribersAdmin() {
  const rows = useQuery(api.subscribers.list, {});
  const { search, filters, setParam } = useTableFilters(["state", "source"]);

  const all = rows ?? [];

  const state = (s: Doc<"subscribers">) =>
    s.unsubscribedAt ? "unsubscribed" : s.confirmed ? "confirmed" : "pending";

  const filtered = all.filter((s) => {
    if (filters.state && state(s) !== filters.state) return false;
    if (filters.source && s.source !== filters.source) return false;
    if (search && !s.email.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const day = (ts: number | undefined) =>
    ts
      ? new Date(ts).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const columns: Column<Doc<"subscribers">>[] = [
    {
      id: "email",
      header: "Email",
      alwaysVisible: true,
      sortValue: (s) => s.email,
      cell: (s) => <span className="truncate text-primary">{s.email}</span>,
    },
    {
      id: "source",
      header: "Source",
      sortValue: (s) => s.source,
      cell: (s) => <span className="text-secondary">{s.source}</span>,
    },
    {
      id: "confirmed",
      header: "Confirmed",
      sortValue: (s) => state(s),
      cell: (s) => {
        const value = state(s);
        return (
          <span
            className={`badge ${
              value === "confirmed"
                ? "badge-live"
                : value === "pending"
                  ? "badge-hot"
                  : "badge-cold"
            }`}
          >
            {value}
          </span>
        );
      },
    },
    {
      id: "joined",
      header: "Joined",
      hideBelow: "md",
      sortValue: (s) => s.createdAt,
      cell: (s) => <span className="text-secondary">{day(s.createdAt)}</span>,
    },
  ];

  /* Sources are whatever the forms have written, so the facet is built from
     the data rather than from a hardcoded list that would drift. */
  const sources = [...new Set(all.map((s) => s.source))].sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscribers"
        description="Everyone on the mailing list, and whether they confirmed."
      />

      <TableToolbar
        search={search}
        onSearch={(v) => setParam("q", v || null)}
        placeholder="Search email"
        filters={filters}
        onFilter={setParam}
        shown={filtered.length}
        total={all.length}
        facets={[
          {
            id: "state",
            label: "State",
            options: [
              { value: "confirmed", label: "Confirmed" },
              { value: "pending", label: "Not confirmed" },
              { value: "unsubscribed", label: "Unsubscribed" },
            ],
          },
          {
            id: "source",
            label: "Source",
            options: sources.map((s) => ({ value: s, label: s })),
          },
        ]}
        onExport={() =>
          downloadCsv(
            "subscribers.csv",
            ["Email", "Source", "State", "Joined"],
            filtered.map((s) => [
              s.email,
              s.source,
              state(s),
              new Date(s.createdAt).toISOString(),
            ]),
          )
        }
      />

      <DataTable
        rows={rows === undefined ? undefined : filtered}
        columns={columns}
        rowKey={(s) => s._id}
        caption="Newsletter subscribers"
        empty={
          <div className="space-y-2">
            <p className="admin-section-title">Nobody has subscribed yet</p>
            <p className="text-[13px] text-secondary">
              The form in the footer adds people here once they confirm.
            </p>
          </div>
        }
      />
    </div>
  );
}
