"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { ScoreBadge } from "@/components/admin/ScoreBadge";
import { LeadDrawer } from "@/components/admin/LeadDrawer";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Leads table.
 *
 * Filtering runs on the server so a long list never ships in full to the
 * browser, and the selected lead lives in the URL rather than in component
 * state — which makes a lead link shareable, survivable across a refresh, and
 * reachable from the command palette.
 */

const STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

type Status = (typeof STATUSES)[number];
type Band = "hot" | "warm" | "cold";

export function LeadsTable() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id");

  const [status, setStatus] = useState<Status | "">("");
  const [band, setBand] = useState<Band | "">("");
  const [search, setSearch] = useState("");

  const leads = useQuery(api.admin.leads, {
    status: status || undefined,
    band: band || undefined,
    search: search.trim() || undefined,
  });

  const setLeadStatus = useMutation(api.admin.setLeadStatus);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("id", id);
    else next.delete("id");
    router.replace(`/admin/leads?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Leads</h1>
        <p className="mt-1 text-sm text-secondary">
          {leads === undefined
            ? "Loading…"
            : `${leads.length} ${leads.length === 1 ? "lead" : "leads"}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="lead-search" className="sr-only">
          Search leads
        </label>
        <input
          id="lead-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company or email"
          className="hairline min-w-0 flex-1 rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary placeholder:text-secondary sm:max-w-xs"
        />

        <Filter
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as Status | "")}
          options={STATUSES}
        />
        <Filter
          label="Temperature"
          value={band}
          onChange={(v) => setBand(v as Band | "")}
          options={["hot", "warm", "cold"] as const}
        />
      </div>

      {leads === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-1" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <p className="admin-card text-sm text-secondary">
          Nothing matches those filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border-hairline)] text-left">
                <Th>Name</Th>
                <Th>Project</Th>
                <Th>Score</Th>
                <Th>Status</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: Doc<"leads">) => (
                <tr
                  key={lead._id}
                  onClick={() => select(lead._id)}
                  className="cursor-pointer border-b border-[color:var(--border-hairline)] transition-colors duration-fast hover:bg-surface-1"
                >
                  <td className="py-3 pr-4">
                    <div className="text-primary">{lead.name || "—"}</div>
                    <div className="text-xs text-secondary">
                      {lead.company || lead.email}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-secondary">
                    {lead.projectType ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <ScoreBadge score={lead.score ?? 0} />
                  </td>
                  <td className="py-3 pr-4">
                    {/* Inline status change: the most common edit by far, and
                        making it require opening the drawer would be busywork.
                        stopPropagation so changing it does not also open the
                        drawer underneath. */}
                    <select
                      value={lead.status}
                      aria-label={`Status for ${lead.name || lead.email}`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        void setLeadStatus({
                          id: lead._id,
                          status: e.target.value as Status,
                        });
                      }}
                      className="hairline rounded-md bg-surface-1 px-2 py-1 text-xs text-secondary"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-xs text-secondary whitespace-nowrap">
                    {relative(lead._creationTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId ? (
        <LeadDrawer id={selectedId} onClose={() => select(null)} />
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="pb-2 pr-4 text-xs font-normal text-secondary">
      {children}
    </th>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hairline rounded-lg bg-surface-1 px-3 py-2 text-sm text-secondary"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </>
  );
}

function relative(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
