"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { PageHeader } from "@/components/admin/PageHeader";
import { DeleteSlide } from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Mail that arrived at the domain.
 *
 * Rendered as plain text, never as markup — the same rule SiteFeedbackList
 * follows, for a stronger reason. Feedback comes from a form on my own site;
 * this comes from anyone on the internet who knows the address, which is the
 * most hostile input the application takes. The body is stored as text and
 * printed with whitespace-pre-wrap, and nothing on this page interprets it.
 *
 * Unread first, then newest, because an unread message is a task and a read one
 * is a record — the same sort the rest of the admin uses.
 */
export function InboxAdmin() {
  const rows = useQuery(api.inboundEmails.listAll, {});
  const unread = rows?.filter((r) => !r.read).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Everything sent to hello@yusufcreates.com, including replies to proposals, contracts and invoices."
      />

      {rows === undefined ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty
          title="Nothing yet"
          body="Mail sent to any address at yusufcreates.com lands here. If you are expecting something and it has not appeared, check the webhook in the Resend dashboard — nothing is lost, Resend keeps every message it receives."
        />
      ) : (
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="admin-section-title">
              {rows.length} message{rows.length === 1 ? "" : "s"}
            </h2>
            {unread > 0 ? (
              <span className="badge badge-hot">{unread} unread</span>
            ) : null}
          </div>

          <ul className="mt-3 divide-y divide-[color:var(--border-hairline)]">
            {rows.map((row) => (
              <Message key={row._id} row={row} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Message({ row }: { row: Doc<"inboundEmails"> }) {
  const markRead = useMutation(api.inboundEmails.markRead);
  const remove = useMutation(api.inboundEmails.remove);

  /*
   * The MX record sits on the root domain, so this catches every address at
   * yusufcreates.com — not only hello@. Shown when it was something else,
   * because "who did they write to" is the first question about an address I
   * was not expecting mail at.
   */
  const landedOn = (row.receivedFor ?? row.to).filter(
    (a) => !a.toLowerCase().startsWith("hello@"),
  );

  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between gap-4">
        {/* truncate belongs on the <p>, not on an inner span: overflow does
            not apply to a non-replaced inline box, so on the span it would
            contribute nothing but white-space:nowrap and a 400-character
            subject would run straight through the date. */}
        <p className="min-w-0 truncate text-sm text-primary">
          {!row.read ? (
            <span
              aria-label="Unread"
              className="mr-2 inline-block size-1.5 rounded-full bg-[color:var(--accent)] align-middle"
            />
          ) : null}
          {row.subject}
        </p>
        <span className="shrink-0 text-xs text-secondary tabular-nums">
          {new Date(row.receivedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      <p className="mt-1 text-xs text-secondary">
        from{" "}
        <a
          href={`mailto:${row.from}`}
          className="text-accent transition-opacity duration-hover ease-hover hover:opacity-80"
        >
          {row.from}
        </a>
        {landedOn.length > 0 ? <> · to {landedOn.join(", ")}</> : null}
      </p>

      {/* whitespace-pre-wrap so the line breaks they typed survive, without
          interpreting anything else in what they wrote. */}
      <p className="mt-2 text-sm whitespace-pre-wrap text-secondary">
        {row.text}
      </p>

      {row.attachments.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {row.attachments.map((file) => (
            <li key={file.id}>
              {/*
                Not a stored URL. The route mints a fresh signed link from
                Resend on each click, because the ones Resend issues expire —
                and because the bytes were never pulled into our own storage.
              */}
              <a
                href={`/api/email/inbound/${row._id}/attachment/${file.id}`}
                target="_blank"
                rel="noreferrer"
                className="hairline inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
              >
                {file.filename}
                <span className="text-secondary tabular-nums">
                  {Math.max(1, Math.round(file.size / 1024))}kB
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <a
          href={`mailto:${row.from}?subject=${encodeURIComponent(
            row.subject.startsWith("Re:") ? row.subject : `Re: ${row.subject}`,
          )}`}
          className="hairline rounded-full px-3 py-1 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
        >
          Reply
        </a>
        <button
          type="button"
          onClick={() => void markRead({ id: row._id, read: !row.read })}
          className="hairline ml-auto rounded-full px-3 py-1 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
        >
          {row.read ? "Mark unread" : "Mark read"}
        </button>
        <DeleteSlide
          what="this message"
          onDelete={async () => {
            await remove({ id: row._id });
          }}
        />
      </div>
    </li>
  );
}
