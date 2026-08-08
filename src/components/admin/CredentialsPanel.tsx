"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";
import { Modal } from "@/components/ui/Modal";
import { MiniSlide } from "@/components/ui/MiniSlide";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

/**
 * Credentials for one project.
 *
 * The list shows labels, kinds and usernames. It never shows a secret, and
 * there is deliberately no "reveal all" — a bulk decrypt would make the
 * access log meaningless, because "I opened the project" is not a reason.
 *
 * Reveal is one record, behind a typed reason, logged before the plaintext
 * exists, shown once, and gone in sixty seconds. Every one of those is a
 * separate small friction and they are all intentional: the cost of reading
 * a stored password should be high enough that delegated access wins.
 *
 * Mounted only when its tab is open (see ProjectPanel), so a project sitting
 * on another tab holds no subscription to any of this.
 */

const REVEAL_SECONDS = 60;
const CLIPBOARD_CLEAR_MS = 30_000;

const KIND_LABEL: Record<string, string> = {
  registrar: "Registrar",
  hosting: "Hosting",
  cms: "CMS",
  analytics: "Analytics",
  email: "Email",
  api_key: "API key",
  other: "Other",
};

type CredentialId = Id<"credentials">;

/**
 * A one-second ticker, running only while something needs it.
 *
 * The first tick is scheduled rather than written synchronously — a setState
 * in an effect body cascades an extra render before paint, and the countdown
 * is late by less than one frame either way. Lifted from ExpressAdmin's
 * useNow, which solved the same problem for the express clock.
 */
function useNow(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    const first = setTimeout(() => setNow(Date.now()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [active]);

  return active ? now : null;
}

export function CredentialsPanel({
  projectId,
}: {
  projectId: Id<"clientProjects">;
}) {
  const rows = useQuery(api.credentials.listForProject, { projectId });
  const remove = useMutation(api.credentials.remove);
  const purge = useMutation(api.credentials.purgeProject);

  const [revealing, setRevealing] = useState<{
    id: CredentialId;
    label: string;
  } | null>(null);
  const [logFor, setLogFor] = useState<CredentialId | null>(null);
  const [deleting, setDeleting] = useState<{
    id: CredentialId;
    label: string;
  } | null>(null);
  const [purging, setPurging] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-secondary">
          Encrypted at rest. Reading one is logged, one at a time, with a
          reason.
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="hairline shrink-0 rounded-full px-3 py-1 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
        >
          Add
        </button>
      </div>

      {rows === undefined ? (
        <div className="mt-4 space-y-2" aria-busy="true">
          <div className="h-14 animate-pulse rounded-lg bg-surface-1" />
          <div className="h-14 animate-pulse rounded-lg bg-surface-1" />
        </div>
      ) : rows.length === 0 ? (
        <p className="hairline mt-4 rounded-xl px-4 py-8 text-center text-[13px] text-secondary">
          Nothing stored, which is the best state this can be in. If they need
          to send something, the intake form pushes them toward delegated
          access first.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {rows.map((row) => (
              <li
                key={row._id}
                className="hairline rounded-lg bg-surface-1 px-3.5 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-primary">{row.label}</p>
                    <p className="truncate text-xs text-secondary">
                      {KIND_LABEL[row.kind] ?? row.kind}
                      {row.username ? ` · ${row.username}` : ""}
                    </p>
                    {row.notes ? (
                      <p className="mt-1 text-xs text-secondary">{row.notes}</p>
                    ) : null}
                  </div>

                  <span
                    aria-label="Hidden"
                    className="shrink-0 font-mono text-xs text-secondary"
                  >
                    {row.masked}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setRevealing({ id: row._id, label: row.label })
                    }
                    className="text-xs text-primary transition-colors duration-fast hover:underline"
                  >
                    Reveal
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLogFor(logFor === row._id ? null : row._id)
                    }
                    aria-expanded={logFor === row._id}
                    className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
                  >
                    Access log
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleting({ id: row._id, label: row.label })
                    }
                    className="ml-auto text-xs text-[color:var(--danger)] transition-opacity duration-fast hover:opacity-80"
                  >
                    Delete
                  </button>
                </div>

                {row.lastAccessedAt ? (
                  <p className="admin-meta mt-2">
                    Last read {new Date(row.lastAccessedAt).toLocaleString()}
                  </p>
                ) : null}

                {row.deleteAfter ? (
                  <p className="admin-meta mt-1">
                    Auto-deletes {new Date(row.deleteAfter).toLocaleDateString()}
                  </p>
                ) : null}

                {logFor === row._id ? <AccessLog credentialId={row._id} /> : null}
              </li>
            ))}
          </ul>

          {/*
            The exit ramp, kept visible rather than buried at project
            completion. The best credential store is an empty one, and that
            is only true if emptying it is always one click away.
          */}
          <button
            type="button"
            onClick={() => setPurging(true)}
            className="mt-4 text-xs text-[color:var(--danger)] transition-opacity duration-fast hover:opacity-80"
          >
            Delete all {rows.length} for this project
          </button>
        </>
      )}

      {revealing ? (
        <RevealDialog
          id={revealing.id}
          label={revealing.label}
          onClose={() => setRevealing(null)}
        />
      ) : null}

      {adding ? (
        <AddDialog projectId={projectId} onClose={() => setAdding(false)} />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this credential?"
          body="It cannot be recovered. If it is still needed, they will have to reset it at the source — which is usually the better outcome anyway."
          what={deleting.label}
          onConfirm={async () => {
            await remove({ id: deleting.id });
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}

      {purging ? (
        <ConfirmDialog
          title="Delete every credential on this project?"
          body="All of them, and their access logs, permanently. This is the right thing to do once a project is finished and handed over."
          what="these credentials"
          onConfirm={async () => {
            await purge({ projectId });
          }}
          onClose={() => setPurging(false)}
        />
      ) : null}
    </div>
  );
}

/* ==================================================================== *
 *  REVEAL                                                              *
 * ==================================================================== */

function RevealDialog({
  id,
  label,
  onClose,
}: {
  id: CredentialId;
  label: string;
  onClose: () => void;
}) {
  const reveal = useAction(api.credentials.reveal);

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<{
    username?: string;
    secret: string;
    expiresAt: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const now = useNow(shown !== null);
  const remaining =
    shown && now ? Math.max(0, Math.ceil((shown.expiresAt - now) / 1000)) : REVEAL_SECONDS;

  /*
   * A pending clipboard wipe must never fire into a dead component — but it
   * also must not be skipped just because the modal closed. So the timer is
   * cleared on unmount, and the wipe is performed immediately instead.
   */
  useEffect(
    () => () => {
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
        void navigator.clipboard?.writeText("").catch(() => {});
      }
    },
    [],
  );

  // Auto-close at zero. Reading the countdown rather than setting a second
  // timeout keeps the two from disagreeing about when "up" is.
  useEffect(() => {
    if (shown && now && now >= shown.expiresAt) onClose();
  }, [shown, now, onClose]);

  const onConfirm = useCallback(async () => {
    setError(null);
    try {
      const result = await reveal({ id, reason });
      setShown({
        username: result.username,
        secret: result.secret,
        expiresAt: Date.now() + REVEAL_SECONDS * 1000,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That could not be revealed.",
      );
      // Rethrown so MiniSlide rolls its thumb back rather than reading as
      // confirmed.
      throw err;
    }
  }, [reveal, id, reason]);

  const copy = useCallback(async () => {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(shown.secret);
      setCopied(true);
    } catch {
      // Denied by permissions, or a non-secure origin. Claiming a copy that
      // did not happen is worse than saying nothing.
      setError("The browser refused clipboard access — select and copy it by hand.");
      return;
    }

    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      /*
       * Best effort, and only ours to give. The page must be focused for a
       * clipboard write to be permitted, so if the password has already been
       * pasted into another window this silently does nothing — which is why
       * the reveal is time-boxed as well.
       */
      void navigator.clipboard.writeText("").catch(() => {});
      setCopied(false);
    }, CLIPBOARD_CLEAR_MS);
  }, [shown]);

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={shown ? label : `Reveal “${label}”?`}
      description={
        shown
          ? undefined
          : "This is logged against your account with the reason you give."
      }
    >
      {shown ? (
        <div>
          {shown.username ? (
            <div className="mb-3">
              <p className="admin-meta">Username</p>
              <p className="mt-1 font-mono text-sm break-all text-primary">
                {shown.username}
              </p>
            </div>
          ) : null}

          <p className="admin-meta">Password</p>
          <p className="mt-1 rounded-lg bg-surface-2 px-3 py-2.5 font-mono text-sm break-all text-primary select-all">
            {shown.secret}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void copy()}
              className="hairline rounded-full px-3.5 py-1.5 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
            >
              {copied ? "Copied" : "Copy"}
            </button>

            {/*
              Not aria-live. This changes every second and a polite region
              would queue an announcement per tick — the same reason
              RollingNumber refuses to announce itself.
            */}
            <span
              className={`font-mono text-sm tabular-nums ${
                remaining <= 10
                  ? "text-[color:var(--danger)]"
                  : remaining <= 25
                    ? "text-[color:var(--text-notice)]"
                    : "text-secondary"
              }`}
            >
              {remaining}s
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-secondary">
            This closes on its own in {remaining} seconds and cannot be shown
            again without a fresh reason.
            {copied ? " The clipboard is wiped 30 seconds after copying." : ""}
          </p>

          {error ? (
            <p role="alert" className="mt-3 text-xs text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div>
          <label htmlFor="reveal-reason" className="text-[13px] text-primary">
            Why do you need this?
          </label>
          <textarea
            id="reveal-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            autoFocus
            placeholder="Updating the DNS records to point at the new host."
            className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary placeholder:text-secondary"
          />
          <p className="mt-1.5 text-xs text-secondary">
            Kept permanently against this credential. Write it for whoever
            reads the log in six months, including you.
          </p>

          {error ? (
            <p role="alert" className="mt-3 text-xs text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="mt-5">
            <MiniSlide
              label="Slide to reveal"
              pendingLabel="Decrypting"
              doneLabel="Revealed"
              ariaLabel={`Slide to reveal ${label}`}
              disabled={reason.trim().length < 10}
              onConfirm={onConfirm}
            />
          </div>

          {reason.trim().length < 10 ? (
            <p className="mt-2 text-xs text-secondary">
              A few more words — the log is only useful if the reasons in it
              still make sense later.
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

/* ==================================================================== *
 *  ACCESS LOG                                                          *
 * ==================================================================== */

function AccessLog({ credentialId }: { credentialId: CredentialId }) {
  const entries = useQuery(api.credentials.accessLog, { credentialId });

  if (entries === undefined) {
    return (
      <p className="admin-meta mt-3" aria-busy="true">
        Loading…
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="mt-3 text-xs text-secondary">
        Never read since it was stored.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2 border-t border-[color:var(--border-hairline)] pt-3">
      {entries.map((entry) => (
        <li key={entry._id}>
          <p className="admin-meta">
            {new Date(entry.accessedAt).toLocaleString()} · {entry.accessedBy}
          </p>
          <p className="mt-0.5 text-xs text-primary">{entry.reason}</p>
        </li>
      ))}
    </ul>
  );
}

/* ==================================================================== *
 *  ADD                                                                 *
 * ==================================================================== */

/**
 * For the ones that arrive by email anyway.
 *
 * Pretending that never happens does not stop it — it just leaves the
 * password sitting in an inbox indefinitely. Moving it in here and deleting
 * the email is strictly better than both.
 */
function AddDialog({
  projectId,
  onClose,
}: {
  projectId: Id<"clientProjects">;
  onClose: () => void;
}) {
  const add = useAction(api.credentials.addAsAdmin);

  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("other");
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!label.trim() || !secret) {
      setError("It needs a name and a value.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await add({
        projectId,
        label,
        kind: kind as "other",
        username: username.trim() || undefined,
        secret,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Store a credential"
      description="Encrypted before it is written. Delete the email it came from afterwards."
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="cred-label" className="text-[13px] text-primary">
            What it opens
          </label>
          <input
            id="cred-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoComplete="off"
            className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
          />
        </div>

        <div>
          <label htmlFor="cred-kind" className="text-[13px] text-primary">
            Kind
          </label>
          <select
            id="cred-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
          >
            {Object.entries(KIND_LABEL).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cred-username" className="text-[13px] text-primary">
            Username
          </label>
          <input
            id="cred-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
          />
        </div>

        <div>
          <label htmlFor="cred-secret" className="text-[13px] text-primary">
            Password or key
          </label>
          <input
            id="cred-secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="new-password"
            className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 font-mono text-sm text-primary"
          />
        </div>

        <div>
          <label htmlFor="cred-notes" className="text-[13px] text-primary">
            Notes <span className="text-secondary">(not encrypted)</span>
          </label>
          <textarea
            id="cred-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
          />
        </div>

        {error ? (
          <p role="alert" className="text-xs text-[color:var(--danger)]">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="min-h-10 w-full rounded-full bg-[color:var(--accent-solid)] px-4 text-sm font-medium text-white transition-[filter,opacity] duration-fast hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Encrypting…" : "Store it"}
        </button>
      </div>
    </Modal>
  );
}
