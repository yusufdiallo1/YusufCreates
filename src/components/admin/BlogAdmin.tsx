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
  GalleryUpload,
  type ImageRatio,
} from "@/components/admin/shared/Fields";
import { FieldError } from "@/components/ui/FieldError";
import { DateTimePicker } from "@/components/admin/shared/DateTimePicker";
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
  kind: "text" as PostKind,
  images: [] as string[],
  imageRatio: "4:5" as ImageRatio,
  videoUrl: "",
};

type PostKind = "text" | "images" | "video";

/** The three shapes a post can take, and what each one asks for. */
const KINDS: { id: PostKind; label: string; hint: string }[] = [
  { id: "text", label: "Text", hint: "Writing, with an optional cover." },
  { id: "images", label: "Images", hint: "A gallery. Words optional." },
  { id: "video", label: "Video", hint: "An upload, or a YouTube link." },
];

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
            Markdown. A future date schedules it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
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
                  className="admin-card block w-full text-left transition-colors duration-hover ease-hover hover:bg-surface-2"
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
                kind: draft.kind,
                // Only the media the chosen type uses. Sending a stale
                // gallery on a post switched to video would keep images
                // attached to something that no longer shows them.
                images: draft.kind === "images" ? draft.images : [],
                imageRatio: draft.imageRatio,
                videoUrl: draft.kind === "video" ? draft.videoUrl : "",
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
                kind: draft.kind,
                // Only the media the chosen type uses. Sending a stale
                // gallery on a post switched to video would keep images
                // attached to something that no longer shows them.
                images: draft.kind === "images" ? draft.images : [],
                imageRatio: draft.imageRatio,
                videoUrl: draft.kind === "video" ? draft.videoUrl : "",
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
          // Absent on every post written before kinds existed, and those are
          // all text posts.
          kind: post.kind ?? "text",
          images: post.images ?? [],
          imageRatio: (post.imageRatio ?? "4:5") as ImageRatio,
          videoUrl: post.videoUrl ?? "",
        }
      : { ...EMPTY, publishedAt: toLocalInput(Date.now()) },
  );
  const [saving, setSaving] = useState(false);
  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  // Same reason as the list: sampled once, used only to show a hint.
  const [mountedAt] = useState(() => Date.now());

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  /*
   * A body is only required for a text post.
   *
   * A gallery or a video is the content on those, and forcing a paragraph
   * before you can save one means writing filler to satisfy the form.
   */
  const hasContent =
    draft.kind === "text"
      ? draft.body.trim() !== ""
      : draft.kind === "images"
        ? draft.images.length > 0
        : draft.videoUrl.trim() !== "";

  const valid =
    draft.title.trim() !== "" && draft.slug.trim() !== "" && hasContent;

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

        {/* First decision, before anything else is asked.
            What kind of post this is changes which fields matter, so choosing
            it after filling the form means filling the wrong form. */}
        <div className="mt-6">
          <span className="text-sm text-secondary">Post type</span>
          <div
            role="radiogroup"
            aria-label="Post type"
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            {KINDS.map((k) => {
              const active = draft.kind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set("kind", k.id)}
                  className={`rounded-xl border p-3 text-left transition-colors duration-hover ease-hover ${
                    active
                      ? "border-[color:var(--accent)] bg-surface-2"
                      : "border-[color:var(--border-hairline)] bg-surface-1 hover:bg-surface-2"
                  }`}
                >
                  <span className="block text-sm text-primary">{k.label}</span>
                  <span className="mt-0.5 block text-xs text-secondary">
                    {k.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {draft.kind === "text" ? (
          <div className="admin-card mt-6">
            <p className="text-sm text-primary">Draft it for me</p>
            <p className="mt-1 text-xs text-secondary">
              Say what the post is about. Everything it writes is editable, and
              nothing publishes without you reading it.
            </p>
            <TextArea
              label="Brief"
              rows={3}
              value={brief}
              onChange={setBrief}
            />
            {draftError ? <FieldError>{draftError}</FieldError> : null}
            <button
              type="button"
              disabled={drafting || brief.trim() === ""}
              onClick={async () => {
                setDrafting(true);
                setDraftError(null);
                try {
                  const res = await fetch("/api/compose/post", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brief }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error ?? "Could not draft.");

                  // Only fills what is empty — a redraft must not silently
                  // discard something already written.
                  setDraft((d) => ({
                    ...d,
                    title: d.title || json.title,
                    slug:
                      d.slug ||
                      String(json.title ?? "")
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    excerpt: d.excerpt || json.excerpt,
                    body: d.body || json.body,
                    tags: d.tags.length ? d.tags : (json.tags ?? []),
                  }));
                } catch (err) {
                  setDraftError(
                    err instanceof Error ? err.message : "Could not draft.",
                  );
                } finally {
                  setDrafting(false);
                }
              }}
              className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-primary transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
            >
              {drafting ? "Drafting…" : "Draft with AI"}
            </button>
          </div>
        ) : null}

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
            label={draft.kind === "video" ? "Poster image" : "Cover image"}
            value={draft.coverUrl}
            onChange={(v) => set("coverUrl", v)}
          />

          {/* Only the fields the chosen type actually uses. A gallery
              uploader sitting empty on a text post is a question that never
              needed asking. */}
          {draft.kind === "images" ? (
            <GalleryUpload
              values={draft.images}
              onChange={(v) => set("images", v)}
              ratio={draft.imageRatio}
              onRatioChange={(v) => set("imageRatio", v)}
            />
          ) : null}

          {draft.kind === "video" ? (
            <Field
              label="Video"
              value={draft.videoUrl}
              onChange={(v) => set("videoUrl", v)}
              placeholder="https://youtube.com/watch?v=… or an MP4 URL"
              help="YouTube, Vimeo or a direct MP4. The player works it out from the link."
            />
          ) : null}

          <Markdown
            label={draft.kind === "text" ? "Body" : "Body (optional)"}
            value={draft.body}
            onChange={(v) => set("body", v)}
          />
          <TagInput
            label="Tags"
            values={draft.tags}
            onChange={(v) => set("tags", v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <DateTimePicker
              id="post-at"
              label="Publish date"
              value={draft.publishedAt}
              onChange={(v) => set("publishedAt", v)}
            />
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

          {/* Says which of the two it is, rather than leaving a pre-filled
              date to be read as "scheduled" when it means "now". Only the
              future case is a warning; the immediate case is the default and
              is stated plainly. */}
          {draft.published ? (
            new Date(draft.publishedAt).getTime() > mountedAt ? (
              <p className="text-xs text-[color:var(--text-notice)]">
                Scheduled — this stays hidden until that date passes.
              </p>
            ) : (
              <p className="text-xs text-secondary">
                Goes live as soon as you save. Set a future date to schedule
                it instead.
              </p>
            )
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

