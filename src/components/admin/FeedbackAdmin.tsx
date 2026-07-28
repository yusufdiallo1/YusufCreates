"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";

/**
 * Client feedback, grouped by project.
 *
 * Unresolved groups sort first, because resolved feedback is a record and
 * unresolved feedback is a task.
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

      {groups === undefined ? (
        <Skeleton />
      ) : groups.length === 0 ? (
        <Empty
          title="No feedback yet"
          body="Comments left against a project appear here, grouped by project."
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
                        className="hairline shrink-0 rounded-full px-3 py-1 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
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
