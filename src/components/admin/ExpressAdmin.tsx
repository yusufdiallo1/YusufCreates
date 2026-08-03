"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import { DeleteSlide } from "@/components/admin/shared/Fields";
import { MiniSlide } from "@/components/ui/MiniSlide";

/**
 * Express builds.
 *
 * Ordered by what needs me, not by date: queued is waiting to be accepted,
 * building is a clock running down. Anything delivered is a record.
 *
 * Accepting is a slide rather than a button because it starts a two-hour
 * commitment with money attached, and a click that lands by accident should
 * not be able to do that.
 */

/**
 * Plan labels, matching the chooser on /start.
 *
 * Rows created before the inbox was generalised carry no plan and are all
 * express, which is why the lookup defaults rather than showing nothing.
 */
const PLAN_LABEL: Record<string, string> = {
  express: "Express",
  "one-page": "One-page site",
  "multi-page": "Multi-page site",
  "web-app": "Web app",
  native: "iOS / macOS app",
  enterprise: "Enterprise",
  revive: "Revive",
  support: "Support",
};

/** A live clock, so a running build shows time left rather than a timestamp. */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    /*
     * The first tick is scheduled, not written synchronously.
     *
     * A setState in an effect body cascades an extra render before paint —
     * and the countdown is late by less than one frame either way, which is
     * invisible on a clock that ticks in seconds.
     */
    const id = setInterval(() => setNow(Date.now()), 1000);
    const first = setTimeout(() => setNow(Date.now()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [active]);
  return now;
}

export function ExpressAdmin() {
  const rows = useQuery(api.express.listAll, {});
  const deliver = useMutation(api.express.deliver);
  const cancel = useMutation(api.express.cancel);
  const remove = useMutation(api.express.remove);
  const markPaid = useMutation(api.express.markDepositPaidManually);
  const setPreview = useMutation(api.express.setPreviewUrl);
  const startBuild = useMutation(api.express.startBuild);
  const skipPayment = useMutation(api.express.skipPaymentAndStart);

  const [urls, setUrls] = useState<Record<string, string>>({});
  // One thread open at a time: these are read in passing between builds, not
  // sat in, and several open logs on one screen is noise rather than context.
  const [openThread, setOpenThread] = useState<Id<"expressBuilds"> | null>(
    null,
  );
  const anyRunning = rows?.some((r) => r.status === "building") ?? false;
  const now = useNow(anyRunning);

  const money = (minor: number, currency: string) =>
    (minor / 100).toLocaleString("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    });

  return (
    <div className="space-y-6">
      {/*
        Cards, not a DataTable, and deliberately.

        Each row carries a live countdown, a different set of actions per
        status, a preview URL field and its own message thread. That is
        heterogeneous content per item — the case cards exist for. A table of
        "client, plan, paid, due" would hide everything that makes this screen
        usable and need a drawer to put it back.

        The title is "Express" everywhere now. It used to be "Requests" here,
        "Express" in the breadcrumb and "Express builds" in the sidebar.
      */}
      <PageHeader
        title="Express"
        description="Approving creates the client, their portal, and emails the link."
      />

      {rows === undefined ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty
          title="No express orders yet"
          body="Anyone who buys the express build appears here. Accept one to start its clock."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const left = row.dueAt && now ? row.dueAt - now : null;
            const late = left !== null && left <= 0;
            const abs = left === null ? 0 : Math.abs(left);
            const pad = (n: number) => String(n).padStart(2, "0");

            return (
              <li key={row._id} className="admin-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-primary">
                      {row.name}
                      <span className="ml-2 text-xs text-secondary">
                        {row.email}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {PLAN_LABEL[row.plan ?? "express"] ?? row.plan} ·{" "}
                      {row.pages} {row.pages === 1 ? "page" : "pages"} ·{" "}
                      {/*
                        A skipped build owes nothing, so it says that once
                        rather than reciting two zeroes. Printing "$0.00 paid
                        · balance waived" is technically true and reads like
                        a bug.
                      */}
                      {row.paymentSkipped ? (
                        "free — payment skipped"
                      ) : (
                        <>
                          {/* "paid" only once it actually is. The deposit
                              figure sat under the word "paid" from the moment
                              a request arrived, which read as money already
                              received. */}
                          {row.depositPaidAt
                            ? `${money(row.depositAmount, row.currency)} paid`
                            : `${money(row.depositAmount, row.currency)} to start`}{" "}
                          ·{" "}
                          {row.balanceWaived
                            ? "balance waived"
                            : `${money(row.balanceAmount, row.currency)} due`}
                          {row.manualPayment ? " · marked paid by hand" : ""}
                        </>
                      )}
                    </p>
                  </div>

                  {row.status === "building" && left !== null ? (
                    <span
                      className={`shrink-0 text-lg tabular-nums ${
                        late
                          ? "text-[color:var(--danger)]"
                          : abs < 15 * 60_000
                            ? "text-[color:var(--text-notice)]"
                            : "text-primary"
                      }`}
                    >
                      {late ? "−" : ""}
                      {pad(Math.floor(abs / 3_600_000))}:
                      {pad(Math.floor((abs % 3_600_000) / 60_000))}:
                      {pad(Math.floor((abs % 60_000) / 1000))}
                    </span>
                  ) : (
                    <span
                      /* Approved states read GREEN and stay in the list.
                         A request vanishing the moment I approved it meant
                         the one thing I most wanted to look at — the job I
                         just took on — was the only thing I could not see. */
                      className={`badge shrink-0 ${
                        row.status === "pending_approval"
                          ? "badge-hot"
                          : row.status === "awaiting_payment" ||
                              row.status === "paid_review" ||
                              row.status === "building" ||
                              row.status === "delivered"
                            ? "badge-live"
                            : "badge-cold"
                      }`}
                    >
                      {row.status.replaceAll("_", " ")}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm whitespace-pre-wrap text-secondary">
                  {row.brief}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {/* An unpaid order has no action otherwise, so a transfer,
                      a dropped webhook or a test run leaves it stuck here
                      forever. Slide rather than click: it records money as
                      received. */}
                  {row.status === "awaiting_payment" ? (
                    <div className="w-[14rem]">
                      <MiniSlide
                        label="Slide to mark deposit paid"
                        pendingLabel="Marking"
                        doneLabel="Marked paid"
                        ariaLabel={`Mark the deposit paid by hand for ${row.name}`}
                        onConfirm={async () => {
                          await markPaid({ id: row._id });
                        }}
                      />
                    </div>
                  ) : null}

                  {/* The decision. Both paths email the client, so neither
                      is a status flip — approving sends the portal link and
                      unlocks payment, declining says no and why. It does NOT
                      start the clock; paying does. */}
                  {row.status === "pending_approval" ? (
                    <Decision id={row._id} name={row.name} />
                  ) : null}

                  {/* Paid, clock NOT running. The deliberate gap: money
                      cleared, and the two hours start when I say so. */}
                  {row.status === "paid_review" ? (
                    <div className="w-[14rem]">
                      <MiniSlide
                        label="Slide to start the clock"
                        pendingLabel="Starting"
                        doneLabel="Running"
                        ariaLabel={`Start the build for ${row.name}`}
                        onConfirm={async () => {
                          await startBuild({ id: row._id });
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Start without charging. For the ones where taking money
                      is the wrong move — and it skips the review step too,
                      since I would not waive a fee for a brief I had not
                      already read. */}
                  {row.status === "awaiting_payment" ||
                  row.status === "paid_review" ? (
                    <button
                      type="button"
                      onClick={() => void skipPayment({ id: row._id })}
                      className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
                    >
                      Skip payment & start
                    </button>
                  ) : null}

                  {row.status === "building" ? (
                    <>
                      {/* Work in progress, not delivery. Posting this lets
                          them watch it take shape; `deliver` below is what
                          ends the job and settles the balance. */}
                      <PreviewField
                        // Keyed by the stored value so a change from
                        // elsewhere remounts the field rather than being
                        // synced into it from an effect.
                        key={row.previewUrl ?? ""}
                        current={row.previewUrl ?? ""}
                        onSave={async (url) => {
                          await setPreview({ id: row._id, url });
                        }}
                      />
                      <input
                        type="url"
                        value={urls[row._id] ?? ""}
                        onChange={(e) =>
                          setUrls((u) => ({ ...u, [row._id]: e.target.value }))
                        }
                        placeholder="https:// where it is live"
                        className="hairline min-w-0 flex-1 rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary"
                      />
                      <div className="w-[11.5rem]">
                        <MiniSlide
                          label="Slide to deliver"
                          pendingLabel="Delivering"
                          doneLabel="Delivered"
                          ariaLabel={`Deliver the build for ${row.name}`}
                          disabled={!urls[row._id]?.trim()}
                          onConfirm={async () => {
                            await deliver({
                              id: row._id,
                              url: urls[row._id] ?? "",
                            });
                          }}
                        />
                      </div>
                    </>
                  ) : null}

                  {row.deliveredUrl ? (
                    <a
                      href={row.deliveredUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent transition-opacity duration-fast hover:opacity-80"
                    >
                      Open the site
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setOpenThread((t) => (t === row._id ? null : row._id))
                    }
                    aria-expanded={openThread === row._id}
                    className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
                  >
                    Messages
                  </button>

                  <a
                    href={`/portal/${row.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
                  >
                    Their view
                  </a>

                  {row.status !== "delivered" &&
                  row.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => void cancel({ id: row._id })}
                      className="text-xs text-secondary transition-colors duration-fast hover:text-[color:var(--text-notice)]"
                    >
                      Cancel
                    </button>
                  ) : null}

                  <div className="ml-auto">
                    <DeleteSlide
                      what={`the express build for ${row.name}`}
                      onDelete={async () => {
                        await remove({ id: row._id });
                      }}
                    />
                  </div>
                </div>

                {openThread === row._id ? (
                  <Thread id={row._id} name={row.name} />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Approve or decline, both of which email the client.
 *
 * Two slides rather than two buttons: each one sends mail the moment it
 * lands, and neither is undoable by clicking again. A stray click that tells
 * someone I have turned their project down is not a mistake I want to be one
 * pixel away from.
 *
 * The note is offered before declining rather than after, because a decline
 * with a reason and a decline without one are different emails and the choice
 * has to be made while there is still something to attach it to. It is
 * optional — sometimes there is nothing useful to add beyond no.
 */
function Decision({ id, name }: { id: Id<"expressBuilds">; name: string }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const post = async (path: string, body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError("That didn't go through. Nothing was sent.");
      throw new Error("Decision failed.");
    }
    /*
     * The route reports what the email did separately from what the mutation
     * did, and "recorded but not emailed" is the state worth surfacing — the
     * client is now waiting on an email that will never arrive unless I know
     * to chase it.
     */
    const data = (await res.json().catch(() => ({}))) as { email?: string };
    if (data.email && data.email !== "sent" && data.email !== "already-sent") {
      setError(`Recorded, but the email was ${data.email}. Send it by hand.`);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[13rem]">
          <MiniSlide
            label="Slide to approve"
            pendingLabel="Approving"
            doneLabel="Approved"
            ariaLabel={`Approve the brief from ${name}`}
            onConfirm={async () => {
              // The route, not the mutation: approving has to send the portal
              // link, and Convex cannot send mail. Calling the mutation here
              // would unlock payment on a portal nobody is told about.
              await post("/api/express/approve", { id });
            }}
          />
        </div>

        <div className="w-[13rem]">
          <MiniSlide
            label="Slide to decline"
            pendingLabel="Declining"
            doneLabel="Declined"
            ariaLabel={`Decline the brief from ${name}`}
            onConfirm={async () => {
              await post("/api/express/decline", { id, note });
            }}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`decline-note-${id}`}
          className="text-xs text-secondary"
        >
          Note for a decline (optional) — goes in the email and on their portal
        </label>
        <textarea
          id={`decline-note-${id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Why this one isn't a fit, and what to ask for instead…"
          className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary placeholder:text-secondary"
        />
      </div>

      {error ? (
        <p className="text-xs text-[color:var(--text-notice)]">{error}</p>
      ) : null}
    </div>
  );
}

/**
 * The work-in-progress link.
 *
 * Saved explicitly rather than on every keystroke: a URL is half-invalid
 * while it is being typed, and the client is watching this field's output.
 * The button only appears once the text differs from what is stored, so a
 * row that is already correct carries no call to action.
 */
function PreviewField({
  current,
  onSave,
}: {
  current: string;
  onSave: (url: string) => Promise<void>;
}) {
  /*
   * Seeded once from the stored value.
   *
   * Re-syncing in an effect would cascade a render on every keystroke's
   * round trip; the caller keys this component on `current` instead, so a
   * value that changes underneath remounts the field with the new text
   * rather than patching it mid-edit.
   */
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);

  const dirty = value.trim() !== current.trim();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https:// preview, if you have one"
        aria-label="Preview URL"
        className="hairline min-w-0 flex-1 rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary"
      />
      {dirty ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onSave(value.trim()).finally(() => setBusy(false));
          }}
          className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * My side of a build's thread.
 *
 * Opening it marks their messages read, for the same reason the client's
 * portal does: looking at them IS reading them, and a separate button is one
 * more thing to forget.
 */
function Thread({ id, name }: { id: Id<"expressBuilds">; name: string }) {
  const messages = useQuery(api.express.threadFor, { id });
  const reply = useMutation(api.express.replyMessage);
  const markRead = useMutation(api.express.markThreadRead);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const list = messages ?? [];
  const unreadCount = list.filter((m) => m.fromClient && !m.readAt).length;

  useEffect(() => {
    if (unreadCount === 0) return;
    void markRead({ id });
  }, [id, unreadCount, markRead]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  return (
    <div className="hairline-t mt-4 pt-4">
      <div ref={logRef} className="max-h-64 space-y-2 overflow-y-auto">
        {list.length === 0 ? (
          <p className="text-xs text-secondary">
            Nothing yet. Anything {name} sends from their portal lands here.
          </p>
        ) : (
          list.map((m) => (
            <div
              key={m._id}
              className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm ${
                m.fromClient
                  ? "bg-surface-2 text-primary"
                  : "ml-auto bg-[color:var(--accent)] text-primary"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body || busy) return;
          setBusy(true);
          setDraft("");
          void reply({ id, body }).finally(() => setBusy(false));
        }}
        className="mt-3 flex items-center gap-2"
      >
        <label htmlFor={`reply-${id}`} className="sr-only">
          Reply to {name}
        </label>
        <input
          id={`reply-${id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply…"
          className="hairline min-w-0 flex-1 rounded-full bg-surface-1 px-4 py-2 text-sm text-primary placeholder:text-secondary"
        />
        <button
          type="submit"
          disabled={busy || draft.trim() === ""}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
