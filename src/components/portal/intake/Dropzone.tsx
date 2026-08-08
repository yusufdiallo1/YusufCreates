"use client";

import { useCallback, useRef, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { uploadFile } from "@/lib/upload";
import { FieldError } from "@/components/ui/FieldError";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Drag-and-drop upload, with a real file input underneath.
 *
 * The first dropzone in this codebase — everything else uses the hidden-input
 * pattern in admin/shared/Fields.tsx, which is fine for an operator uploading
 * one cover image and wrong for a client dragging a folder of logos in.
 *
 * The hidden input is kept, not replaced. Drag-and-drop is a pointer-only
 * affordance: it does not exist on a phone, and it cannot be reached by
 * keyboard at all. So the visible control is a real <button> that opens the
 * picker, and the drop target is an enhancement layered on top of it.
 *
 * THE SIZE LIMIT IS ON SCREEN, not discovered by failing. Someone who drags
 * in a 200MB video and waits for a progress bar before being told no has been
 * treated badly.
 */

const MAX_BYTES = 50 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type UploadedFile = {
  _id: Id<"intakeFiles">;
  name: string;
  size: number;
};

export function Dropzone({
  token,
  sectionId,
  fieldId,
  label,
  accept,
  multiple = true,
  files,
  disabled,
}: {
  token: string;
  sectionId: string;
  fieldId: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  /** Already uploaded, filtered to this field by the caller. */
  files: UploadedFile[];
  disabled?: boolean;
}) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.intake.generateUploadUrl);
  const attach = useMutation(api.intake.attachFile);
  const remove = useMutation(api.intake.removeFile);

  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0) return;
      setError(null);

      const chosen = Array.from(list);

      /*
       * Size is checked here as well as inside uploadFile. The helper throws
       * after the request is already in flight; catching it up front means an
       * over-size file is rejected instantly and by name, rather than as a
       * generic failure once the upload has started.
       */
      const tooBig = chosen.filter((f) => f.size > MAX_BYTES);
      if (tooBig.length > 0) {
        setError(
          `${tooBig[0].name} is ${formatSize(tooBig[0].size)} — the limit is 50MB. Send it as a link instead and I will pick it up.`,
        );
        return;
      }

      setBusy((n) => n + chosen.length);

      /*
       * Sequential, not Promise.all. These are phone uploads over a mobile
       * connection, and five parallel large files is how you get all five to
       * time out instead of three succeeding.
       */
      for (const file of chosen) {
        try {
          const { storageId } = await uploadFile(
            file,
            () => generateUploadUrl({ token }),
            (id) =>
              convex.query(api.files.getUrl, { storageId: id as never }),
          );

          await attach({
            token,
            sectionId,
            fieldId,
            storageId: storageId as Id<"_storage">,
            name: file.name,
            size: file.size,
            contentType: file.type || undefined,
          });
        } catch (err) {
          setError(
            err instanceof Error
              ? `${file.name}: ${err.message}`
              : `${file.name} did not upload.`,
          );
        } finally {
          setBusy((n) => n - 1);
        }
      }

      // Cleared so the same file can be picked again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    },
    [attach, convex, fieldId, generateUploadUrl, sectionId, token],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (disabled) return;
          // Both handlers must preventDefault or the browser navigates to the
          // dropped file instead of handing it over.
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed px-4 py-6 text-center transition-colors duration-fast ${
          over
            ? "border-[color:var(--accent)] bg-surface-2"
            : "border-[color:var(--border-hairline)] bg-surface-1"
        }`}
      >
        <button
          type="button"
          disabled={disabled || busy > 0}
          onClick={() => inputRef.current?.click()}
          className="hairline min-h-11 rounded-full bg-surface-2 px-4 text-[13px] text-primary transition-colors duration-fast hover:bg-surface-3 disabled:opacity-50"
        >
          {busy > 0 ? `Uploading ${busy}…` : label}
        </button>

        {/* Pointer-only, so it is hidden from assistive tech — the button
            above is the real control and does the same job. */}
        <p aria-hidden="true" className="mt-2 hidden text-xs text-secondary sm:block">
          or drop {multiple ? "files" : "a file"} here
        </p>

        <p className="mt-2 text-xs text-secondary">
          Up to 50MB each
          {accept ? ` · ${accept.replace(/\./g, "").replace(/,/g, ", ")}` : ""}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => void handle(e.target.files)}
        />
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      {files.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {files.map((file) => (
            <li
              key={file._id}
              className="hairline flex items-center justify-between gap-3 rounded-lg bg-surface-1 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] text-primary">
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-secondary">
                {formatSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => void remove({ token, fileId: file._id })}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 text-xs text-secondary transition-colors duration-fast hover:text-[color:var(--danger)]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
