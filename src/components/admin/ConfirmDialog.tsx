"use client";

import { useState } from "react";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";

/**
 * The one place a destructive action is confirmed.
 *
 * SlideToConfirm used to sit on every list row — five different widths of it
 * across five screens. That is backwards twice over: it puts the most
 * destructive action in the most prominent position on every row, and using
 * the gesture everywhere destroys the meaning it had when it was rare. A
 * slide that appears fifty times on a page is just a slow button.
 *
 * So delete moves into the row's ⋯ menu, and the gesture lives here, once,
 * behind that menu item. It is now the thing it was designed to be: an
 * interruption you meet only when you have already said you want to delete
 * something.
 *
 * Modal rather than drawer, deliberately. The rule across the admin is
 * drawers for creating and editing records, modals for confirmations and
 * short single-purpose forms — and this is the shortest single purpose there
 * is.
 */
export function ConfirmDialog({
  title,
  body,
  what,
  onConfirm,
  onClose,
}: {
  title: string;
  /** One line on what is about to happen and whether it can be undone. */
  body: string;
  /** Named in the slide's own label: "Slide to delete this proposal". */
  what: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        // Backdrop click cancels. mousedown rather than click so a drag that
        // starts inside the panel and ends outside does not dismiss it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="glass-depth glass-near glass-panel relative w-full max-w-sm p-6"
      >
        <h2 id="confirm-title" className="admin-section-title">
          {title}
        </h2>
        <p className="mt-2 text-[13px] text-secondary">{body}</p>

        <div className="mt-6">
          <SlideToConfirm
            purpose="delete"
            ariaLabel={`Slide to delete ${what}`}
            onConfirm={async () => {
              setError(null);
              try {
                await onConfirm();
                onClose();
              } catch {
                /*
                 * Rethrown so the control rolls its thumb back. Resolving
                 * would draw the confirmation tick for a delete that did not
                 * happen, which is the worst possible outcome here.
                 */
                setError("That didn't delete. Try again.");
                throw new Error("delete failed");
              }
            }}
          />
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-xs text-[color:var(--danger)]">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 text-[13px] text-secondary transition-colors duration-fast hover:text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
