"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Reorder } from "motion/react";
import { api } from "@/lib/convex-api";
import {
  DeleteRow,
  Field,
  ImageUpload,
  TextArea,
} from "@/components/admin/shared/Fields";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Testimonials.
 *
 * Client-submitted ones arrive unapproved and never auto-publish — approving
 * is a deliberate act, because a quote appearing on the homepage the moment it
 * is written is how a typo or an off-message line ships itself.
 */

const EMPTY = {
  author: "",
  role: "",
  company: "",
  quote: "",
  website: "",
  avatarUrl: "",
  // Shown by default. The homepage only reads featured rows, so the old
  // default meant every testimonial I added went nowhere until I found the
  // checkbox at the bottom of the drawer — the common case needed the extra
  // step, and hiding one is the rarer decision.
  featured: true,
};

export function TestimonialsAdmin() {
  const rows = useQuery(api.testimonials.listAll, {});
  const create = useMutation(api.testimonials.create);
  const update = useMutation(api.testimonials.update);
  const remove = useMutation(api.testimonials.remove);
  const reorder = useMutation(api.testimonials.reorder);

  const [editing, setEditing] = useState<Doc<"testimonials"> | "new" | null>(
    null,
  );
  const [order, setOrder] = useState<Doc<"testimonials">[] | null>(null);
  const list = order ?? rows ?? [];

  const pending = list.filter((t) => t.approved === false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Testimonials</h1>
          <p className="mt-1 text-sm text-secondary">
            {pending.length > 0
              ? `${pending.length} waiting for approval.`
              : "Drag to reorder. Featured ones show on the homepage."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
        >
          Add testimonial
        </button>
      </div>

      {rows === undefined ? (
        <Skeleton />
      ) : list.length === 0 ? (
        <Empty
          title="No testimonials yet"
          body="Add one by hand, or they arrive from the request sent after a project ends."
        />
      ) : (
        <Reorder.Group
          axis="y"
          values={list}
          onReorder={setOrder}
          className="space-y-2"
        >
          {list.map((item) => (
            <Reorder.Item
              key={item._id}
              value={item}
              onDragEnd={() => {
                if (order) void reorder({ ids: order.map((t) => t._id) });
              }}
              className="admin-card cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-primary">{item.author}</span>
                    {item.approved === false ? (
                      <span className="badge badge-hot">pending</span>
                    ) : null}
                    {item.featured ? (
                      <span className="badge">featured</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-secondary">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </button>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {item.approved === false ? (
                    <button
                      type="button"
                      onClick={() =>
                        void update({ id: item._id, approved: true })
                      }
                      className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-canvas"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void update({ id: item._id, featured: !item.featured })
                      }
                      className="hairline rounded-full px-3 py-1 text-xs text-primary"
                    >
                      {item.featured ? "Unfeature" : "Feature"}
                    </button>
                  )}
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {editing ? (
        <Drawer
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (editing === "new") {
              await create({
                ...draft,
                order: list.length,
                approved: true,
              });
            } else {
              await update({ id: editing._id, ...draft });
            }
            setEditing(null);
            setOrder(null);
          }}
          onDelete={
            editing === "new"
              ? undefined
              : async () => {
                  await remove({ id: editing._id });
                  setEditing(null);
                  setOrder(null);
                }
          }
        />
      ) : null}
    </div>
  );
}

function Drawer({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: Doc<"testimonials"> | null;
  onClose: () => void;
  onSave: (d: typeof EMPTY) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(() =>
    item
      ? {
          author: item.author,
          role: item.role ?? "",
          company: item.company ?? "",
          quote: item.quote,
          website: item.website ?? "",
          avatarUrl: item.avatarUrl ?? "",
          featured: item.featured,
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const valid = draft.author.trim() !== "" && draft.quote.trim() !== "";

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
        aria-label={item ? "Edit testimonial" : "New testimonial"}
        className="glass-depth glass-near relative h-full w-full max-w-md overflow-y-auto p-6"
      >
        <h2 className="text-lg text-primary">
          {item ? "Edit testimonial" : "New testimonial"}
        </h2>

        <div className="mt-6 space-y-4">
          <Field
            label="Author"
            value={draft.author}
            onChange={(v) => set("author", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Role"
              value={draft.role}
              onChange={(v) => set("role", v)}
            />
            <Field
              label="Company"
              value={draft.company}
              onChange={(v) => set("company", v)}
            />
          </div>
          <TextArea
            label="Quote"
            rows={4}
            value={draft.quote}
            onChange={(v) => set("quote", v)}
          />

          {/* Directly under the quote, not at the foot of the drawer. This is
              what decides whether the testimonial appears at all, and below
              the avatar upload it was under the fold — easy to save without
              ever seeing. */}
          <label className="flex items-center gap-2.5 text-sm text-secondary">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="size-4 rounded"
            />
            Show on the homepage
          </label>

          <Field
            label="Website"
            value={draft.website}
            onChange={(v) => set("website", v)}
            placeholder="thecuratedroute.com"
            help="Linked from their quote. https:// is added if you leave it off."
          />
          <ImageUpload
            shape="avatar"
            label="Avatar"
            value={draft.avatarUrl}
            onChange={(v) => set("avatarUrl", v)}
          />
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
            <DeleteRow what={draft.author} onDelete={onDelete} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
