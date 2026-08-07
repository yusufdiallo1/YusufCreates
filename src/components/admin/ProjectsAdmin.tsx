"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Reorder } from "motion/react";
import { api } from "@/lib/convex-api";
import {
  DeleteRow,
  Field,
  ImageUpload,
  Markdown,
  TagInput,
  TextArea,
} from "@/components/admin/shared/Fields";
import type { Doc } from "@convex/_generated/dataModel";

/**
 * Projects and case studies.
 *
 * The list reorders by drag and persists on drop; the editor is a drawer
 * rather than a separate route, so reordering and editing do not fight over
 * navigation state.
 */

const EMPTY = {
  title: "",
  slug: "",
  client: "",
  year: new Date().getFullYear(),
  category: "",
  summary: "",
  coverUrl: "",
  problem: "",
  process: "",
  result: "",
  liveUrl: "",
  techStack: [] as string[],
  status: "draft" as "draft" | "published" | "archived",
  featured: false,
};

type Draft = typeof EMPTY;

export function ProjectsAdmin() {
  const projects = useQuery(api.projects.listAll, {});
  const create = useMutation(api.projects.create);
  const update = useMutation(api.projects.update);
  const remove = useMutation(api.projects.remove);
  const reorder = useMutation(api.projects.reorder);

  const [editing, setEditing] = useState<Doc<"projects"> | "new" | null>(null);
  const [order, setOrder] = useState<Doc<"projects">[] | null>(null);

  const rows = order ?? projects ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Projects</h1>
          <p className="mt-1 text-sm text-secondary">
            Drag to reorder. This is the order on the work page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
        >
          New project
        </button>
      </div>

      {projects === undefined ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty
          title="No projects yet"
          body="Add one and it appears on the work page once published."
        />
      ) : (
        <Reorder.Group
          axis="y"
          values={rows}
          onReorder={setOrder}
          className="space-y-2"
        >
          {rows.map((project) => (
            <Reorder.Item
              key={project._id}
              value={project}
              // Persist on drop rather than on every frame — reordering five
              // items would otherwise fire dozens of mutations.
              onDragEnd={() => {
                if (order) void reorder({ ids: order.map((p) => p._id) });
              }}
              className="admin-card flex cursor-grab items-center justify-between gap-4 active:cursor-grabbing"
            >
              <button
                type="button"
                onClick={() => setEditing(project)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="truncate text-sm text-primary">
                    {project.title}
                  </span>
                  <span className="badge">{project.status}</span>
                  {project.featured ? (
                    <span className="badge badge-hot">featured</span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-secondary">
                  /work/{project.slug} · {project.client}
                </p>
              </button>
              <span aria-hidden="true" className="shrink-0 text-secondary">
                ⠿
              </span>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {editing ? (
        <ProjectDrawer
          project={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (editing === "new") {
              await create({ ...draft, order: rows.length });
            } else {
              // update takes a nested patch; slug is omitted because
              // changing a live URL breaks every existing link to it.
              const { slug: _slug, ...patch } = draft;
              void _slug;
              await update({ id: editing._id, patch });
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

function ProjectDrawer({
  project,
  onClose,
  onSave,
  onDelete,
}: {
  project: Doc<"projects"> | null;
  onClose: () => void;
  onSave: (draft: Draft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    project
      ? {
          title: project.title,
          slug: project.slug,
          client: project.client,
          year: project.year,
          category: project.category,
          summary: project.summary,
          coverUrl: project.coverUrl ?? "",
          problem: project.problem ?? "",
          process: project.process ?? "",
          result: project.result ?? "",
          liveUrl: project.liveUrl ?? "",
          techStack: project.techStack ?? [],
          status: project.status,
          featured: project.featured,
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const valid =
    draft.title.trim() !== "" &&
    draft.slug.trim() !== "" &&
    draft.summary.trim() !== "";

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
        aria-label={project ? "Edit project" : "New project"}
        className="glass-depth glass-near relative h-full w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-primary">
            {project ? "Edit project" : "New project"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-secondary transition-colors duration-hover ease-hover hover:text-primary"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <Field
            label="Title"
            value={draft.title}
            onChange={(v) => {
              set("title", v);
              // Slug follows the title until it is edited by hand, so a new
              // project never ships with an empty or mismatched URL.
              if (!project) {
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
            help="The URL. Changing it on a live project breaks existing links."
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Client"
              value={draft.client}
              onChange={(v) => set("client", v)}
            />
            <Field
              label="Year"
              type="number"
              value={String(draft.year)}
              onChange={(v) => set("year", Number(v) || EMPTY.year)}
            />
          </div>
          <Field
            label="Category"
            value={draft.category}
            onChange={(v) => set("category", v)}
          />

          {/* Up here, not below three Markdown editors. It was the last field
              in a long scrolling drawer, so it read as missing entirely — and
              a case study with no link to the thing it describes is the most
              common thing to forget. */}
          <Field
            label="Live URL"
            value={draft.liveUrl}
            onChange={(v) => set("liveUrl", v)}
            placeholder="https://"
            help="Linked from the work card and the case study."
          />

          <TextArea
            label="Summary"
            rows={3}
            value={draft.summary}
            onChange={(v) => set("summary", v)}
            help="One or two lines. Shown on the work grid."
          />

          <ImageUpload
            label="Cover image"
            value={draft.coverUrl}
            onChange={(v) => set("coverUrl", v)}
          />

          <Markdown
            label="Problem"
            value={draft.problem}
            onChange={(v) => set("problem", v)}
          />
          <Markdown
            label="Process"
            value={draft.process}
            onChange={(v) => set("process", v)}
          />
          <Markdown
            label="Result"
            value={draft.result}
            onChange={(v) => set("result", v)}
          />

          <TagInput
            label="Tech stack"
            values={draft.techStack}
            onChange={(v) => set("techStack", v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="p-status" className="text-sm text-secondary">
                Status
              </label>
              <select
                id="p-status"
                value={draft.status}
                onChange={(e) =>
                  set("status", e.target.value as Draft["status"])
                }
                className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
              >
                {["draft", "published", "archived"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2.5 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="size-4 rounded"
                />
                Featured
              </label>
            </div>
          </div>
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
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
          >
            Cancel
          </button>
        </div>

        {onDelete ? (
          <div className="mt-10">
            <p className="mb-2 text-xs text-secondary">
              Deleting is permanent and breaks any link to this case study.
            </p>
            <DeleteRow what={draft.title} onDelete={onDelete} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-1" />
      ))}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="admin-card text-center">
      <p className="text-sm text-primary">{title}</p>
      <p className="mt-1.5 text-sm text-secondary">{body}</p>
    </div>
  );
}
