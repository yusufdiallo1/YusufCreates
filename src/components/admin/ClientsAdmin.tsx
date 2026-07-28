"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Field } from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Clients and their portal access.
 *
 * Adding an email here is what grants portal access — convex/auth.ts refuses
 * to create an account for any address that is not already in this table, so
 * this list is the guest list.
 *
 * The projects ticked here are the only ones that client can ever see. Every
 * portal query filters by them server-side.
 */
export function ClientsAdmin() {
  const clients = useQuery(api.portal.listClients, {});
  const projects = useQuery(api.projects.listAll, {});
  const create = useMutation(api.portal.createClient);
  const remove = useMutation(api.portal.removeClient);

  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Clients</h1>
          <p className="mt-1 text-sm text-secondary">
            Adding someone here is what lets them sign in to the portal. The
            projects you tick are the only ones they can ever see.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
        >
          Add client
        </button>
      </div>

      {clients === undefined ? (
        <Skeleton />
      ) : clients.length === 0 ? (
        <Empty
          title="No clients yet"
          body="Add one to give them access to project status, files and invoices."
        />
      ) : (
        <ul className="space-y-2">
          {clients.map((client) => (
            <li
              key={client._id}
              className="admin-card flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm text-primary">{client.name}</p>
                <p className="mt-0.5 text-xs text-secondary">
                  {client.email}
                  {client.company ? ` · ${client.company}` : ""}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {client.projectIds.length}{" "}
                  {client.projectIds.length === 1 ? "project" : "projects"}
                  {client.lastLoginAt
                    ? ` · last signed in ${new Date(client.lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                    : " · never signed in"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove({ id: client._id })}
                className="shrink-0 text-xs text-secondary transition-colors duration-fast hover:text-[color:var(--text-notice)]"
              >
                Remove access
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <AddDialog
          projects={(projects ?? []).map((p) => ({
            id: p._id,
            title: p.title,
          }))}
          onClose={() => setAdding(false)}
          onCreate={async (draft) => {
            await create(draft);
            setAdding(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AddDialog({
  projects,
  onClose,
  onCreate,
}: {
  projects: { id: Id<"projects">; title: string }[];
  onClose: () => void;
  onCreate: (d: {
    email: string;
    name: string;
    company?: string;
    projectIds: Id<"projects">[];
  }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [selected, setSelected] = useState<Id<"projects">[]>([]);
  const [saving, setSaving] = useState(false);

  const valid =
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && name.trim() !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add client"
        className="glass-depth glass-near glass-panel relative max-h-[85dvh] w-full max-w-md overflow-y-auto p-6"
      >
        <h2 className="text-lg text-primary">Add client</h2>
        <p className="mt-1 text-xs text-secondary">
          They sign in with this address. Nobody who is not on this list can
          create an account.
        </p>

        <div className="mt-5 space-y-4">
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Company" value={company} onChange={setCompany} />

          <div>
            <span className="text-sm text-secondary">Projects</span>
            <p className="mt-1 text-xs text-secondary">
              Only these will be visible to them.
            </p>
            <div className="mt-2 space-y-1.5">
              {projects.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2.5 text-sm text-primary"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, p.id]
                          : selected.filter((id) => id !== p.id),
                      )
                    }
                    className="size-4 rounded"
                  />
                  {p.title}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-secondary hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onCreate({
                  email: email.trim(),
                  name: name.trim(),
                  company: company.trim() || undefined,
                  projectIds: selected,
                });
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {saving ? "Adding…" : "Add client"}
          </button>
        </div>
      </div>
    </div>
  );
}
