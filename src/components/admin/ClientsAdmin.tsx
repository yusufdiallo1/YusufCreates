"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Field, TextArea } from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProjectPanel } from "@/components/admin/ProjectPanel";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Clients and their projects.
 *
 * A client project is the work being done FOR them — not one of my portfolio
 * pieces. Those were the same table until now, which meant this screen offered
 * my own case studies as things to assign, which made no sense.
 *
 * Adding a client here is what lets them sign in: convex/auth.ts refuses to
 * create an account for any address not already in this table, so this list is
 * the guest list.
 */

const STATUSES = [
  "planning",
  "active",
  "review",
  "complete",
  "on_hold",
] as const;

export function ClientsAdmin() {
  const clients = useQuery(api.portal.listClients, {});
  const create = useMutation(api.portal.createClient);
  const addProject = useMutation(api.portal.addProject);
  const setStatus = useMutation(api.portal.setProjectStatus);
  const remove = useMutation(api.portal.removeClient);

  const [adding, setAdding] = useState(false);
  const [addingTo, setAddingTo] = useState<Id<"clients"> | null>(null);
  /** Project whose milestones, files and chat are open. */
  const [managing, setManaging] = useState<{
    id: Id<"clientProjects">;
    name: string;
  } | null>(null);
  const [removing, setRemoving] = useState<Id<"clients"> | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Clients</h1>
          <p className="mt-1 text-sm text-secondary">
            Each client gets their own project, a portal link, and a direct
            chat with me.
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
          body="Adding one creates their project and a portal link you can send straight over."
        />
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => (
            <li key={client._id} className="admin-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-primary">{client.name}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {client.email}
                    {client.company ? ` · ${client.company}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    {client.lastLoginAt
                      ? `Last signed in ${new Date(client.lastLoginAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : "Has not signed in yet"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* The portal link. Same for every client — access comes
                      from who they sign in as, not from a secret URL, so this
                      is safe to send in plain email. */}
                  <CopyButton
                    value={`${origin}/portal`}
                    label="Copy portal link"
                  />
                  <button
                    type="button"
                    onClick={() => setAddingTo(client._id)}
                    className="hairline rounded-full px-3 py-1 text-xs text-primary"
                  >
                    Add project
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(client._id)}
                    className="text-xs text-secondary transition-colors duration-fast hover:text-[color:var(--text-notice)]"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {client.projects.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {client.projects.map((project) => (
                    <li
                      key={project._id}
                      className="hairline flex items-center justify-between gap-3 rounded-lg bg-surface-1 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-primary">
                          {project.name}
                        </p>
                        {project.description ? (
                          <p className="mt-0.5 truncate text-xs text-secondary">
                            {project.description}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setManaging({
                            id: project._id,
                            name: project.name,
                          })
                        }
                        className="hairline shrink-0 rounded-full px-3 py-1 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
                      >
                        Manage
                      </button>
                      <select
                        value={project.status}
                        aria-label={`Status for ${project.name}`}
                        onChange={(e) =>
                          void setStatus({
                            id: project._id,
                            status: e.target
                              .value as (typeof STATUSES)[number],
                          })
                        }
                        className="hairline shrink-0 rounded-md bg-surface-2 px-2 py-1 text-xs text-secondary"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-xs text-secondary">
                  No project yet — add one so they have something to see.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <AddClientDialog
          onClose={() => setAdding(false)}
          onCreate={async (d) => {
            await create(d);
            setAdding(false);
          }}
        />
      ) : null}

      {managing ? (
        <ProjectPanel
          projectId={managing.id}
          projectName={managing.name}
          onClose={() => setManaging(null)}
        />
      ) : null}

      {removing ? (
        <RemoveClientDialog
          client={clients?.find((c) => c._id === removing)}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await remove({ id: removing });
            setRemoving(null);
          }}
        />
      ) : null}

      {addingTo ? (
        <AddProjectDialog
          onClose={() => setAddingTo(null)}
          onCreate={async (d) => {
            await addProject({ clientId: addingTo, ...d });
            setAddingTo(null);
          }}
        />
      ) : null}
    </div>
  );
}

function AddClientDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: {
    email: string;
    name: string;
    company?: string;
    projectName: string;
    projectDescription?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const valid =
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) &&
    name.trim() !== "" &&
    projectName.trim() !== "";

  return (
    <Dialog label="Add client" onClose={onClose}>
      <h2 className="text-lg text-primary">Add client</h2>
      <p className="mt-1 text-xs text-secondary">
        For someone who came to you directly. Anyone who sent a request through
        the site becomes a client automatically when you approve it — you do not
        need to add them here.
      </p>
      <p className="mt-2 text-xs text-secondary">
        They sign in with this address — nobody not on this list can create an
        account. Their project is created at the same time so the portal has
        something to show.
      </p>

      <div className="mt-5 space-y-4">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Company" value={company} onChange={setCompany} />

        <div className="rule" />

        <Field
          label="Project name"
          value={projectName}
          onChange={setProjectName}
          help="What you're building for them."
        />
        <TextArea
          label="Description"
          rows={3}
          value={projectDescription}
          onChange={setProjectDescription}
        />
      </div>

      <Actions
        onClose={onClose}
        disabled={!valid || saving}
        label={saving ? "Adding…" : "Add client"}
        onConfirm={async () => {
          setSaving(true);
          try {
            await onCreate({
              email: email.trim(),
              name: name.trim(),
              company: company.trim() || undefined,
              projectName: projectName.trim(),
              projectDescription: projectDescription.trim() || undefined,
            });
          } finally {
            setSaving(false);
          }
        }}
      />
    </Dialog>
  );
}

function AddProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: { name: string; description?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog label="Add project" onClose={onClose}>
      <h2 className="text-lg text-primary">Add project</h2>
      <div className="mt-5 space-y-4">
        <Field label="Project name" value={name} onChange={setName} />
        <TextArea
          label="Description"
          rows={3}
          value={description}
          onChange={setDescription}
        />
      </div>
      <Actions
        onClose={onClose}
        disabled={name.trim() === "" || saving}
        label={saving ? "Adding…" : "Add project"}
        onConfirm={async () => {
          setSaving(true);
          try {
            await onCreate({
              name: name.trim(),
              description: description.trim() || undefined,
            });
          } finally {
            setSaving(false);
          }
        }}
      />
    </Dialog>
  );
}

function Dialog({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
        aria-label={label}
        className="glass-depth glass-near glass-panel relative max-h-[85dvh] w-full max-w-md overflow-y-auto p-6"
      >
        {children}
      </div>
    </div>
  );
}

function Actions({
  onClose,
  onConfirm,
  disabled,
  label,
}: {
  onClose: () => void;
  onConfirm: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
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
        disabled={disabled}
        onClick={onConfirm}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
      >
        {label}
      </button>
    </div>
  );
}

/**
 * Removing a client takes their projects, milestones, files and messages with
 * it, and revokes their sign-in. That is not recoverable, so it gets the
 * slide gesture rather than a click that a mis-tap can trigger.
 */
function RemoveClientDialog({
  client,
  onClose,
  onConfirm,
}: {
  client?: { name: string; email: string; projects: unknown[] };
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
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
        aria-label="Remove client"
        className="glass-depth glass-near glass-panel relative w-full max-w-md p-6"
      >
        <h2 className="text-lg text-primary">
          Remove {client?.name ?? "this client"}?
        </h2>
        <p className="mt-3 text-sm text-secondary">
          This deletes their {client?.projects.length ?? 0} project
          {client?.projects.length === 1 ? "" : "s"} along with every milestone,
          file and message, and stops {client?.email} from signing in. Invoices
          are kept — those are financial records.
        </p>

        <div className="mt-6">
          <SlideToConfirm
            purpose="delete"
            ariaLabel={`Slide to remove ${client?.name ?? "client"}`}
            onConfirm={onConfirm}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-secondary transition-colors duration-fast hover:text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
