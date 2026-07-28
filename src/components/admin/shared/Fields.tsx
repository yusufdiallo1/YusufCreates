"use client";

import { useRef, useState } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "@/lib/convex-api";
import { uploadImage } from "@/lib/upload";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";

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
          className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
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

/**
 * Minimal markdown for the preview only — headings, bold, links, paragraphs.
 * The published page renders through the same subset, so what is previewed is
 * what ships.
 */
function renderMarkdown(source: string): React.ReactNode {
  return source.split(/\n{2,}/).map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return <h2 key={i}>{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith("# ")) {
      return <h1 key={i}>{trimmed.slice(2)}</h1>;
    }
    if (trimmed.startsWith("- ")) {
      return (
        <ul key={i}>
          {trimmed.split("\n").map((line, j) => (
            <li key={j}>{line.replace(/^-\s*/, "")}</li>
          ))}
        </ul>
      );
    }
    return <p key={i}>{trimmed}</p>;
  });
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
              className="text-secondary transition-colors duration-fast hover:text-primary"
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
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <span className="text-sm text-secondary">{label}</span>

      {/* Plain img, not next/image: these are arbitrary Convex storage URLs
          and this is an admin-only preview, so optimisation buys nothing and
          the remote-pattern config it would need is pure overhead. */}
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="hairline mt-2 aspect-[2/1] w-full rounded-lg object-cover"
        />
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="hairline rounded-full px-3.5 py-1.5 text-xs text-primary transition-colors duration-fast hover:bg-surface-2 disabled:opacity-50"
        >
          {busy ? "Uploading…" : value ? "Replace" : "Upload"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
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
