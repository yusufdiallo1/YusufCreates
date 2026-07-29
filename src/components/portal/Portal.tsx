"use client";

import { useState } from "react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Logo } from "@/components/ui/Logo";
import { PayPanel } from "@/components/portal/PayPanel";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Client portal.
 *
 * Everything shown here is derived from the authenticated session — the
 * component never asks for a project by id, because a client-supplied id is
 * exactly what must not be trusted. The server decides what this person can
 * see and returns only that.
 *
 * Realtime comes free: useQuery is reactive, so a milestone I mark done or a
 * reply I post appears without a refresh.
 */
export function Portal() {
  if (!isConvexConfigured) {
    return (
      <Shell>
        <p className="text-sm text-secondary">
          The portal is not configured yet.
        </p>
      </Shell>
    );
  }

  return (
    <>
      <AuthLoading>
        <Shell>
          <p className="text-sm text-secondary">Checking…</p>
        </Shell>
      </AuthLoading>

      <Unauthenticated>
        <Shell>
          <h1 className="text-2xl">Client portal</h1>
          <p className="mt-3 text-sm text-secondary">
            This is where your project status, files and invoices live. Use the
            link from your welcome email to sign in — if you have lost it, reply
            to any email from me and I will send a fresh one.
          </p>
        </Shell>
      </Unauthenticated>

      <Authenticated>
        <PortalContent />
      </Authenticated>
    </>
  );
}

function PortalContent() {
  const data = useQuery(api.portal.overview, {});
  const invoices = useQuery(api.portal.invoices, {});
  const [active, setActive] = useState<Id<"clientProjects"> | null>(null);
  /** Which invoice has its payment panel open. Only one at a time. */
  const [paying, setPaying] = useState<string | null>(null);

  if (data === undefined) {
    return (
      <Shell>
        <p className="text-sm text-secondary">Loading your projects…</p>
      </Shell>
    );
  }

  const current = active ?? data.projects[0]?._id ?? null;

  return (
    <Shell>
      <h1 className="text-2xl">Hello {data.name.split(" ")[0]}</h1>

      {data.projects.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">
          Nothing here yet. Once a project starts you will see its progress,
          files and invoices on this page.
        </p>
      ) : (
        <>
          {data.projects.length > 1 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {data.projects.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setActive(p._id)}
                  aria-pressed={current === p._id}
                  className={`hairline rounded-full px-3.5 py-1.5 text-xs ${
                    current === p._id
                      ? "bg-surface-2 text-primary"
                      : "text-secondary"
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          ) : null}

          {data.projects
            .filter((p) => p._id === current)
            .map((project) => (
              <div key={project._id} className="mt-8 space-y-10">
                <section aria-labelledby="progress-heading">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 id="progress-heading" className="text-lg">
                      {project.title}
                    </h2>
                    <span className="text-sm text-secondary tabular-nums">
                      {project.percentComplete}% complete
                    </span>
                  </div>

                  <div
                    className="mt-3 h-1.5 rounded-full bg-surface-2"
                    role="img"
                    aria-label={`${project.percentComplete} percent complete`}
                  >
                    <div
                      className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-slow"
                      style={{ width: `${project.percentComplete}%` }}
                    />
                  </div>

                  <ol className="mt-6 space-y-3">
                    {project.milestones.map((m) => (
                      <li key={m._id} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 size-2 shrink-0 rounded-full ${
                            m.status === "done"
                              ? "bg-[color:var(--accent)]"
                              : m.status === "in_progress"
                                ? "bg-[color:var(--text-notice)]"
                                : "bg-surface-3"
                          }`}
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-sm ${
                              m.status === "done"
                                ? "text-secondary line-through"
                                : "text-primary"
                            }`}
                          >
                            {m.title}
                            <span className="sr-only">
                              {" — "}
                              {m.status === "done"
                                ? "complete"
                                : m.status === "in_progress"
                                  ? "in progress"
                                  : "not started"}
                            </span>
                          </p>
                          {m.description ? (
                            <p className="mt-0.5 text-xs text-secondary">
                              {m.description}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                    {project.milestones.length === 0 ? (
                      <li className="text-sm text-secondary">
                        Milestones appear here as soon as the plan is set.
                      </li>
                    ) : null}
                  </ol>
                </section>

                <Deliverables projectId={project._id} />
                <Messages projectId={project._id} />
              </div>
            ))}
        </>
      )}

      {invoices && invoices.length > 0 ? (
        <section aria-labelledby="invoices-heading" className="mt-12">
          <h2 id="invoices-heading" className="text-lg">
            Invoices
          </h2>
          <ul className="mt-4 space-y-2">
            {invoices.map((inv) => (
              <li key={inv._id} className="hairline rounded-xl bg-surface-1">
                <div className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-primary">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: inv.currency || "USD",
                      maximumFractionDigits: 0,
                    }).format(inv.amount)}
                    <span className="ml-2 text-xs text-secondary">
                      {inv.reference}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {inv.stage === "deposit" ? "Deposit" : "Balance"} ·{" "}
                    {inv.description}
                  </p>
                </div>
                {inv.status === "paid" ? (
                  <span className="badge badge-warm shrink-0">paid</span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setPaying((cur) => (cur === inv._id ? null : inv._id))
                    }
                    aria-expanded={paying === inv._id}
                    className="shrink-0 rounded-full bg-[color:var(--accent-solid)] px-4 py-2 text-xs font-medium text-white transition-opacity duration-fast hover:opacity-90"
                  >
                    {paying === inv._id ? "Close" : "Pay"}
                  </button>
                )}
                </div>

                {/* Payment opens in place. Sending a client to another domain
                    to hand over a deposit is the moment the whole thing feels
                    least like a business and most like a link someone sent. */}
                {paying === inv._id && inv.status !== "paid" ? (
                  <div className="border-t border-transparent px-4 pb-4">
                    <div className="rule mb-4" />
                    <PayPanel token={inv.token} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Shell>
  );
}

function Deliverables({ projectId }: { projectId: Id<"clientProjects"> }) {
  const files = useQuery(api.portal.deliverables, { projectId });
  const approve = useMutation(api.portal.approveDeliverable);

  if (!files || files.length === 0) return null;

  return (
    <section aria-labelledby="files-heading">
      <h2 id="files-heading" className="text-lg">
        Files
      </h2>
      <ul className="mt-4 space-y-2">
        {files.map((file) => (
          <li
            key={file._id}
            className="hairline flex items-center justify-between gap-4 rounded-xl bg-surface-1 p-4"
          >
            <div className="min-w-0">
              <a
                href={file.url}
                className="text-sm text-primary hover:text-accent"
              >
                {file.name}
              </a>
              <p className="mt-0.5 text-xs text-secondary">
                v{file.version} ·{" "}
                {new Date(file.uploadedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            {file.approvedAt ? (
              <span className="badge badge-warm shrink-0">approved</span>
            ) : (
              <button
                type="button"
                onClick={() => void approve({ id: file._id })}
                className="hairline shrink-0 rounded-full px-3.5 py-1.5 text-xs text-primary"
              >
                Approve
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Messages({ projectId }: { projectId: Id<"clientProjects"> }) {
  const messages = useQuery(api.portal.messages, { projectId });
  const post = useMutation(api.portal.postMessage);
  const [draft, setDraft] = useState("");

  return (
    <section aria-labelledby="messages-heading">
      <h2 id="messages-heading" className="text-lg">
        Messages
      </h2>
      <p className="mt-1 text-xs text-secondary">
        Goes straight to me. Replies appear here without a refresh.
      </p>

      <ul className="mt-4 space-y-3">
        {(messages ?? []).map((m) => (
          <li
            key={m._id}
            className={
              m.authorType === "client"
                ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-surface-2 px-4 py-2.5"
                : "hairline w-fit max-w-[85%] rounded-2xl bg-surface-1 px-4 py-2.5"
            }
          >
            <p className="text-xs text-secondary">{m.authorName}</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-primary">
              {m.body}
            </p>
          </li>
        ))}
      </ul>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body) return;
          setDraft("");
          void post({ projectId, body });
        }}
        className="mt-4 flex gap-2"
      >
        <label htmlFor="portal-msg" className="sr-only">
          Your message
        </label>
        <input
          id="portal-msg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask something…"
          className="hairline min-w-0 flex-1 rounded-full bg-surface-1 px-4 py-2.5 text-sm text-primary placeholder:text-secondary"
        />
        <button
          type="submit"
          disabled={draft.trim() === ""}
          className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-canvas disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Logo variant="mark" className="h-7 w-auto" />
      <div className="mt-10">{children}</div>
    </main>
  );
}
