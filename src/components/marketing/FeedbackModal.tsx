"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { usePathname } from "next/navigation";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Modal } from "@/components/ui/Modal";
import { MiniSlide } from "@/components/ui/MiniSlide";
import { FieldError } from "@/components/ui/FieldError";
import { validateEmail, validateRequired } from "@/lib/validate";
import { track } from "@/lib/track";

/**
 * Footer feedback — name, email, what they wanted to say.
 *
 * Separate from the lead form on purpose. Someone reporting a broken link or
 * a typo is not starting a project, and routing them through four steps of
 * project qualification to say "your pricing page is wrong on my phone" is
 * how that message never arrives.
 */

export function FeedbackModal({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Send feedback
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Send feedback"
        description="Something broken, unclear, or missing? Tell me and I will read it."
      >
        <FeedbackForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function FeedbackForm({ onDone }: { onDone: () => void }) {
  const pathname = usePathname();
  const submit = useMutation(api.siteFeedback.submit);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const nameError = validateRequired(name, "your name");
  const emailError = validateEmail(email);
  const messageError = validateRequired(message, "a message");
  const valid = !nameError && !emailError && !messageError;

  if (sent) {
    return (
      <div className="py-2 text-center">
        <p className="text-sm text-primary">Got it — thank you.</p>
        <p className="mt-1.5 text-xs text-secondary">
          I read every one of these myself.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="fb-name" className="text-sm text-secondary">
          Name
        </label>
        <input
          id="fb-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary"
        />
        {touched.name ? <FieldError>{nameError}</FieldError> : null}
      </div>

      <div>
        <label htmlFor="fb-email" className="text-sm text-secondary">
          Email
        </label>
        <input
          id="fb-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          /* 16px on mobile, or iOS zooms the whole page on focus. */
          className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-base text-primary sm:text-sm"
        />
        {touched.email ? <FieldError>{emailError}</FieldError> : null}
      </div>

      <div>
        <label htmlFor="fb-message" className="text-sm text-secondary">
          Feedback
        </label>
        <textarea
          id="fb-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, message: true }))}
          className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary"
        />
        {touched.message ? <FieldError>{messageError}</FieldError> : null}
      </div>

      <MiniSlide
        label="Slide to send"
        pendingLabel="Sending"
        doneLabel="Sent"
        ariaLabel="Slide to send your feedback"
        disabled={!valid || !isConvexConfigured}
        onConfirm={async () => {
          setError(null);
          try {
            await submit({
              name,
              email,
              message,
              path: pathname ?? undefined,
            });
            track("cta_click", { cta: "feedback_sent" });
            setSent(true);
            // Long enough to read the acknowledgement before it closes.
            setTimeout(onDone, 2200);
          } catch {
            setError("That didn't send. Try again in a moment.");
            // Rethrown so the control rolls back to its resting state rather
            // than showing a tick for something that failed.
            throw new Error("failed");
          }
        }}
      />

      <FieldError>{error}</FieldError>
    </div>
  );
}
