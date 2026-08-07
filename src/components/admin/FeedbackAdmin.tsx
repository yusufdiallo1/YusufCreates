"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { DeleteSlide } from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";

/**
 * Two kinds of feedback on one screen.
 *
 * Site feedback comes from the footer form — anyone, about anything. Project
 * feedback is a rating a client left against work in their portal. They are
 * kept apart because a stranger reporting a broken link and a client saying a
 * milestone is wrong need different things from me.
 *
 * Unread and unresolved sort first: resolved feedback is a record, the rest
 * is a task.
 */
export function FeedbackAdmin() {
  const groups = useQuery(api.feedback.listGrouped, {});
  const resolve = useMutation(api.feedback.resolve);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Feedback</h1>
        <p className="mt-1 text-sm text-secondary">
          {groups === undefined
            ? "Loading…"
            : `${groups.reduce((n, g) => n + g.unresolved, 0)} unresolved`}
        </p>
      </div>

      <SiteFeedbackList />

      <CommentsList />

      {groups === undefined ? (
        <Skeleton />
      ) : groups.length === 0 ? (
        <Empty
          title="No project feedback yet"
          body="Comments a client leaves against a project appear here, grouped by project. Feedback sent from the footer form is listed above."
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.projectId}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg text-primary">{group.title}</h2>
                {group.unresolved > 0 ? (
                  <span className="badge badge-hot">
                    {group.unresolved} open
                  </span>
                ) : null}
              </div>

              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item._id}
                    className="admin-card flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="text-sm text-primary"
                          aria-label={`Rated ${item.rating} out of 5`}
                        >
                          {"★".repeat(Math.max(0, Math.min(5, item.rating)))}
                          <span className="text-secondary">
                            {"★".repeat(
                              Math.max(0, 5 - Math.min(5, item.rating)),
                            )}
                          </span>
                        </span>
                        {item.from ? (
                          <span className="text-xs text-secondary">
                            {item.from}
                          </span>
                        ) : null}
                      </div>
                      {item.comment ? (
                        <p className="mt-1.5 text-sm text-secondary">
                          {item.comment}
                        </p>
                      ) : null}
                    </div>

                    {item.resolved ? (
                      <span className="shrink-0 text-xs text-secondary">
                        resolved
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void resolve({ id: item._id, resolved: true })
                        }
                        className="hairline shrink-0 rounded-full px-3 py-1 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
                      >
                        Resolve
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Feedback sent from the footer form.
 *
 * Rendered as plain text, never as markup: anyone can write here, and the
 * only safe assumption about an open input is that someone will eventually
 * put a script tag in it.
 */
function SiteFeedbackList() {
  const rows = useQuery(api.siteFeedback.listAll, {});
  const markRead = useMutation(api.siteFeedback.markRead);
  const remove = useMutation(api.siteFeedback.remove);

  if (rows === undefined) return <Skeleton />;
  if (rows.length === 0) return null;

  const unread = rows.filter((r) => !r.read).length;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg text-primary">From the site</h2>
        {unread > 0 ? (
          <span className="badge badge-hot">{unread} unread</span>
        ) : null}
      </div>

      <ul className="mt-3 divide-y divide-[color:var(--border-hairline)]">
        {rows.map((row) => (
          <li key={row._id} className="py-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm text-primary">
                {row.name}
                <a
                  href={`mailto:${row.email}`}
                  className="ml-2 text-xs text-accent transition-opacity duration-hover ease-hover hover:opacity-80"
                >
                  {row.email}
                </a>
              </p>
              <span className="shrink-0 text-xs text-secondary tabular-nums">
                {new Date(row.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            {/* whitespace-pre-wrap so line breaks they typed survive, without
                interpreting anything else in what they wrote. */}
            <p className="mt-2 text-sm whitespace-pre-wrap text-secondary">
              {row.message}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {row.path ? (
                <span className="text-xs text-secondary">on {row.path}</span>
              ) : null}
              <button
                type="button"
                onClick={() => void markRead({ id: row._id, read: !row.read })}
                className="hairline ml-auto rounded-full px-3 py-1 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
              >
                {row.read ? "Mark unread" : "Mark read"}
              </button>
              <DeleteSlide
                what="this comment"
                onDelete={async () => {
                  await remove({ id: row._id });
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Blog comments awaiting a decision.
 *
 * Held rather than published on submit — an open comment box under writing
 * that sells software is a spam target, and unmoderated spam costs more than
 * the comments are worth. Pending sort first because they are the only ones
 * that need anything from me.
 */
function CommentsList() {
  const rows = useQuery(api.engagement.listComments, {});
  const approve = useMutation(api.engagement.approveComment);
  const remove = useMutation(api.engagement.removeComment);

  if (rows === undefined) return <Skeleton />;
  if (rows.length === 0) return null;

  const pending = rows.filter((r) => !r.approved).length;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg text-primary">Blog comments</h2>
        {pending > 0 ? (
          <span className="badge badge-hot">{pending} to review</span>
        ) : null}
      </div>

      <ul className="mt-3 divide-y divide-[color:var(--border-hairline)]">
        {rows.map((row) => (
          <li key={row._id} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-primary">
                {row.name}
                <a
                  href={`mailto:${row.email}`}
                  className="ml-2 text-xs text-accent transition-opacity duration-hover ease-hover hover:opacity-80"
                >
                  {row.email}
                </a>
              </p>
              <span className="text-xs text-secondary">
                on {row.postTitle}
              </span>
            </div>

            <p className="mt-2 text-sm whitespace-pre-wrap text-secondary">
              {row.body}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {row.approved ? (
                <span className="badge">published</span>
              ) : (
                <span className="badge badge-cold">held</span>
              )}
              <button
                type="button"
                onClick={() =>
                  void approve({ id: row._id, approved: !row.approved })
                }
                className="hairline ml-auto rounded-full px-3 py-1 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
              >
                {row.approved ? "Unpublish" : "Publish"}
              </button>
              <DeleteSlide
                what="this comment"
                onDelete={async () => {
                  await remove({ id: row._id });
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
