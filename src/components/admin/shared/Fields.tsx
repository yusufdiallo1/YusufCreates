"use client";

import { useRef, useState } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "@/lib/convex-api";
import { uploadFile, uploadImage } from "@/lib/upload";
import { renderMarkdown } from "@/lib/markdown";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { MiniSlide } from "@/components/ui/MiniSlide";
import { FieldError } from "@/components/ui/FieldError";

/**
 * Form primitives shared by every admin CRUD screen.
 *
 * Extracted so Projects, Testimonials, Blog and the knowledge base cannot
 * drift into four subtly different text inputs.
 */

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  help?: string;
}) {
  const id = `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
      />
      {help ? <p className="mt-1.5 text-xs text-secondary">{help}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 5,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  help?: string;
}) {
  const id = `t-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 font-mono text-xs leading-relaxed text-primary"
      />
      {help ? <p className="mt-1.5 text-xs text-secondary">{help}</p> : null}
    </div>
  );
}

/**
 * Markdown with a live preview, deliberately not a WYSIWYG.
 *
 * The schema stores plain strings. A rich editor would introduce a
 * serialisation format and a large dependency so that one person — me — can
 * write posts, and markdown is what I would type anyway.
 */
export function Markdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const id = `md-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div>
      <div className="flex items-center justify-between">
        {/* A real label, not a span. Without htmlFor the textarea has no
            accessible name at all — a screen reader announces it as an
            unlabelled edit field. */}
        <label htmlFor={id} className="text-sm text-secondary">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="text-xs text-secondary transition-colors duration-hover ease-hover hover:text-primary"
        >
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {showPreview ? (
        <div className="hairline legal-prose mt-2 min-h-40 rounded-lg bg-surface-1 px-4 py-3 text-sm">
          {renderMarkdown(value)}
        </div>
      ) : (
        <textarea
          id={id}
          rows={14}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 font-mono text-xs leading-relaxed text-primary"
        />
      )}
    </div>
  );
}

/** Chip input for tech stacks and tags. */
export function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const id = `tags-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const add = () => {
    const t = draft.trim();
    // Case-insensitive dedupe: "React" and "react" as separate chips is a bug
    // nobody notices until the public page shows both.
    if (!t || values.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, t]);
    setDraft("");
  };

  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((tag) => (
          <span
            key={tag}
            className="badge inline-flex items-center gap-1.5 text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== tag))}
              aria-label={`Remove ${tag}`}
              className="text-secondary transition-colors duration-hover ease-hover hover:text-primary"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Type and press Enter"
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2 text-sm text-primary"
      />
    </div>
  );
}

/** Upload to Convex storage, with the resolved URL stored on the record. */
export function ImageUpload({
  label,
  value,
  onChange,
  shape = "wide",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /**
   * How the preview is framed.
   *
   * "avatar" previews as the circle it will actually render as. A square logo
   * shown in a 2:1 box reads as squashed and invites cropping a file that was
   * already correct.
   */
  shape?: "wide" | "avatar";
}) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <span className="text-sm text-secondary">{label}</span>

      {/* Plain img, not next/image: this is an admin-only preview of an image
          that was just uploaded, so running it through the optimiser would
          add a round-trip and a cache entry for a thumbnail only I ever see.
          The public pages do use next/image — see images.remotePatterns in
          next.config.ts. */}
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className={
            shape === "avatar"
              ? "hairline mt-2 aspect-square size-28 rounded-full object-cover"
              : "hairline mt-2 aspect-[2/1] w-full rounded-lg object-cover"
          }
        />
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="hairline rounded-full px-3.5 py-1.5 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2 disabled:opacity-50"
        >
          {busy ? "Uploading…" : value ? "Replace" : "Upload"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-secondary transition-colors duration-hover ease-hover hover:text-primary"
          >
            Remove
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const { url } = await uploadImage(
              file,
              () => generateUploadUrl(),
              (storageId) =>
                convex.query(api.files.getUrl, {
                  storageId: storageId as never,
                }),
            );
            onChange(url);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
          } finally {
            setBusy(false);
            // Cleared so re-selecting the same file fires change again.
            e.target.value = "";
          }
        }}
      />

      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-[color:var(--text-notice)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Destructive delete. A slide, not a dialog — this is the one admin action
 * with no undo, and a confirm dialog is dismissed by reflex.
 */
export function DeleteRow({
  what,
  onDelete,
}: {
  what: string;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="w-56">
      <SlideToConfirm
        purpose="delete"
        label={`Slide to delete`}
        ariaLabel={`Slide to permanently delete ${what}`}
        onConfirm={onDelete}
      />
    </div>
  );
}

/**
 * Slide-to-delete sized for a list row.
 *
 * DeleteRow is the drawer-footer version at 14rem; this is the same gesture
 * in the space a table row has. Both exist because a delete that can be
 * triggered by one stray click is the wrong control for something with no
 * undo — and every list here had exactly that.
 */
export function DeleteSlide({
  what,
  onDelete,
}: {
  what: string;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="w-[11.5rem] shrink-0">
      <MiniSlide
        label="Slide to delete"
        pendingLabel="Deleting"
        doneLabel="Deleted"
        ariaLabel={`Slide to permanently delete ${what}`}
        onConfirm={onDelete}
      />
    </div>
  );
}

/**
 * Uploads any file and hands back its URL.
 *
 * Unlike ImageUpload this holds no value of its own — the caller decides what
 * to do with the URL, which for deliverables means inserting a row rather than
 * setting a field.
 */
export function FileUpload({
  label,
  onUploaded,
}: {
  label: string;
  onUploaded: (url: string) => Promise<void> | void;
}) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="hairline rounded-full px-3.5 py-1.5 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2 disabled:opacity-50"
      >
        {busy ? "Uploading…" : label}
      </button>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const { url } = await uploadFile(
              file,
              () => generateUploadUrl(),
              (storageId) =>
                convex.query(api.files.getUrl, {
                  storageId: storageId as never,
                }),
            );
            await onUploaded(url);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "That upload failed.",
            );
          } finally {
            setBusy(false);
            // Cleared so the same file can be picked again after a failure.
            if (inputRef.current) inputRef.current.value = "";
          }
        }}
      />

      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

/** Aspect ratios a gallery post can use. */
export const IMAGE_RATIOS = [
  { id: "4:5", label: "Portrait", hint: "4:5 — the Instagram default", css: "aspect-[4/5]" },
  { id: "1:1", label: "Square", hint: "1:1", css: "aspect-square" },
  { id: "16:9", label: "Landscape", hint: "16:9", css: "aspect-video" },
  { id: "auto", label: "Auto", hint: "Keep each image as it is", css: "" },
] as const;

export type ImageRatio = (typeof IMAGE_RATIOS)[number]["id"];

/**
 * Multi-image uploader for a gallery post.
 *
 * Pick several at once rather than one at a time — a gallery is by definition
 * more than one image, and a control that takes them singly turns posting
 * eight photos into eight round trips through a file dialog.
 *
 * Uploads run in parallel and the order of the result matches the order they
 * were chosen, not the order they happened to finish.
 */
export function GalleryUpload({
  values,
  onChange,
  ratio,
  onRatioChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  ratio: ImageRatio;
  onRatioChange: (next: ImageRatio) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const convex = useConvex();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frame =
    IMAGE_RATIOS.find((r) => r.id === ratio)?.css || "aspect-[4/5]";

  return (
    <div>
      <span className="text-sm text-secondary">
        Images{values.length > 0 ? ` (${values.length})` : ""}
      </span>

      {/* Chosen once for the set. Mixed ratios in one gallery read as an
          accident rather than a decision — Auto is there for the case where
          that is genuinely wanted. */}
      <div
        role="radiogroup"
        aria-label="Image shape"
        className="mt-2 flex flex-wrap gap-2"
      >
        {IMAGE_RATIOS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={ratio === r.id}
            onClick={() => onRatioChange(r.id)}
            title={r.hint}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-hover ease-hover ${
              ratio === r.id
                ? "border-[color:var(--accent)] bg-surface-2 text-primary"
                : "border-[color:var(--border-hairline)] text-secondary hover:text-primary"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {values.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {values.map((url, i) => (
            <div key={`${url}-${i}`} className="group relative">
              <div
                className={`overflow-hidden rounded-lg bg-surface-1 ${ratio === "auto" ? "" : frame}`}
              >
                {/* Plain img: an admin-only thumbnail of something just
                    uploaded does not need the optimiser. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className={
                    ratio === "auto"
                      ? "h-auto w-full"
                      : "size-full object-cover"
                  }
                />
              </div>

              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                aria-label={`Remove image ${i + 1}`}
                className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-[color:var(--bg-canvas)]/80 text-xs text-secondary backdrop-blur transition-colors duration-hover ease-hover hover:text-[color:var(--danger)]"
              >
                ×
              </button>

              <span className="absolute bottom-1.5 left-1.5 rounded bg-[color:var(--bg-canvas)]/80 px-1.5 text-[10px] text-secondary backdrop-blur">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="hairline rounded-full px-4 py-2 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2 disabled:opacity-40"
        >
          {busy
            ? "Uploading…"
            : values.length === 0
              ? "Choose images"
              : "Add more"}
        </button>
        <span className="text-xs text-secondary">
          Pick as many as you like at once.
        </span>
      </div>

      <FieldError>{error}</FieldError>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length === 0) return;
          setBusy(true);
          setError(null);
          try {
            /*
             * Parallel, but the result keeps the order they were chosen in.
             * Promise.all preserves input order regardless of which upload
             * finishes first, which sequential awaits would also do — far
             * more slowly for a set of eight.
             */
            const uploaded = await Promise.all(
              files.map((file) =>
                uploadImage(
                  file,
                  () => generateUploadUrl(),
                  (storageId) =>
                    convex.query(api.files.getUrl, {
                      storageId: storageId as never,
                    }),
                ),
              ),
            );
            onChange([...values, ...uploaded.map((u) => u.url)]);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}
