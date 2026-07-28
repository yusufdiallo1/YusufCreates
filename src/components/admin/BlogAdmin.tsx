"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import {
  DeleteRow,
  Field,
  ImageUpload,
  Markdown,
  TagInput,
  TextArea,
} from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Blog.
 *
 * Scheduling is a published flag plus a future date. listPublished filters on
 * both, so a scheduled post is simply invisible until its moment — no cron, no
 * job to fail, no window where a post is late.
 */

const EMPTY = {
  title: "",
  slug: "",
  body: "",
  excerpt: "",
  coverUrl: "",
  tags: [] as string[],
  published: false,
  publishedAt: "",
};

export function BlogAdmin() {
  const posts = useQuery(api.posts.listAll, {});
  const create = useMutation(api.posts.create);
  const update = useMutation(api.posts.update);
  const remove = useMutation(api.posts.remove);

  const [editing, setEditing] = useState<Doc<"posts"> | "new" | null>(null);
  // Sampled once per mount rather than read during render, which has to stay
  // pure. This only decides whether a badge says "scheduled" or "live", so a
  // clock that is a few minutes stale changes nothing.
  const [now] = useState(() => Date.now());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Blog</h1>
          <p className="mt-1 text-sm text-secondary">
            Markdown. Set a future date to schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
        >
          New post
        </button>
      </div>

      {posts === undefined ? (
        <Skeleton />
      ) : posts.length === 0 ? (
        <Empty title="No posts yet" body="Write one and publish when ready." />
      ) : (
        <ul className="space-y-2">
          {posts.map((post) => {
            const at = post.publishedAt ?? post._creationTime;
            const scheduled = post.published && at > now;
            return (
              <li key={post._id}>
                <button
                  type="button"
                  onClick={() => setEditing(post)}
                  className="admin-card block w-full text-left transition-colors duration-fast hover:bg-surface-2"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm text-primary">{post.title}</span>
                    {scheduled ? (
                      <span className="badge badge-hot">scheduled</span>
                    ) : post.published ? (
                      <span className="badge">live</span>
                    ) : (
                      <span className="badge badge-cold">draft</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-secondary">
                    /blog/{post.slug}
                    {scheduled
                      ? ` · goes live ${new Date(at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`
                      : ""}
                    {post.readingTime ? ` · ${post.readingTime} min read` : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <PostDrawer
          post={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            const publishedAt = draft.publishedAt
              ? new Date(draft.publishedAt).getTime()
              : Date.now();

            if (editing === "new") {
              await create({
                title: draft.title,
                slug: draft.slug,
                body: draft.body,
                excerpt: draft.excerpt || undefined,
                coverUrl: draft.coverUrl || undefined,
                tags: draft.tags,
                published: draft.published,
                publishedAt,
              });
            } else {
              await update({
                id: editing._id,
                title: draft.title,
                slug: draft.slug,
                body: draft.body,
                excerpt: draft.excerpt || undefined,
                coverUrl: draft.coverUrl || undefined,
                tags: draft.tags,
                published: draft.published,
                publishedAt,
              });
            }
            setEditing(null);
          }}
          onDelete={
            editing === "new"
              ? undefined
              : async () => {
                  await remove({ id: editing._id });
                  setEditing(null);
                }
          }
        />
      ) : null}
    </div>
  );
}

/** Datetime-local wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PostDrawer({
  post,
  onClose,
  onSave,
  onDelete,
}: {
  post: Doc<"posts"> | null;
  onClose: () => void;
  onSave: (d: typeof EMPTY) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(() =>
    post
      ? {
          title: post.title,
          slug: post.slug,
          body: post.body,
          excerpt: post.excerpt ?? "",
          coverUrl: post.coverUrl ?? "",
          tags: post.tags ?? [],
          published: post.published,
          publishedAt: toLocalInput(post.publishedAt ?? post._creationTime),
        }
      : { ...EMPTY, publishedAt: toLocalInput(Date.now()) },
  );
  const [saving, setSaving] = useState(false);
  // Same reason as the list: sampled once, used only to show a hint.
  const [mountedAt] = useState(() => Date.now());

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const valid =
    draft.title.trim() !== "" &&
    draft.slug.trim() !== "" &&
    draft.body.trim() !== "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={post ? "Edit post" : "New post"}
        className="glass-depth glass-near relative h-full w-full max-w-2xl overflow-y-auto p-6"
      >
        <h2 className="text-lg text-primary">
          {post ? "Edit post" : "New post"}
        </h2>

        <div className="mt-6 space-y-4">
          <Field
            label="Title"
            value={draft.title}
            onChange={(v) => {
              set("title", v);
              if (!post) {
                set(
                  "slug",
                  v
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
              }
            }}
          />
          <Field
            label="Slug"
            value={draft.slug}
            onChange={(v) => set("slug", v)}
          />
          <TextArea
            label="Excerpt"
            rows={2}
            value={draft.excerpt}
            onChange={(v) => set("excerpt", v)}
            help="Used in the list, the RSS feed and the share card."
          />
          <ImageUpload
            label="Cover image"
            value={draft.coverUrl}
            onChange={(v) => set("coverUrl", v)}
          />
          <Markdown
            label="Body"
            value={draft.body}
            onChange={(v) => set("body", v)}
          />
          <TagInput
            label="Tags"
            values={draft.tags}
            onChange={(v) => set("tags", v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="post-at" className="text-sm text-secondary">
                Publish date
              </label>
              <input
                id="post-at"
                type="datetime-local"
                value={draft.publishedAt}
                onChange={(e) => set("publishedAt", e.target.value)}
                className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
              />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2.5 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => set("published", e.target.checked)}
                  className="size-4 rounded"
                />
                Published
              </label>
            </div>
          </div>

          {draft.published &&
          new Date(draft.publishedAt).getTime() > mountedAt ? (
            <p className="text-xs text-[color:var(--text-notice)]">
              Scheduled — this stays hidden until that date passes.
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(draft);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-secondary hover:text-primary"
          >
            Cancel
          </button>
        </div>

        {onDelete ? (
          <div className="mt-10">
            <DeleteRow what={draft.title} onDelete={onDelete} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
