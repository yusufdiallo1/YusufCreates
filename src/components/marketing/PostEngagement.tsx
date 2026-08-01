"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion, useReducedMotion } from "motion/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { visitorId } from "@/lib/referral";
import { MiniSlide } from "@/components/ui/MiniSlide";
import { FieldError } from "@/components/ui/FieldError";
import { validateRequired } from "@/lib/validate";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Likes and comments under a post.
 *
 * Liking needs no account — the visitor id already minted for referrals
 * identifies the browser well enough to toggle one like. Someone determined
 * can clear it and like twice; requiring sign-in to like a blog post would
 * cost more than that is worth.
 *
 * Comments are held for approval and say so on submit, because a comment that
 * silently vanishes reads as a broken form.
 */

export function PostEngagement({ postId }: { postId: string }) {
  const reduceMotion = useReducedMotion();
  const [visitor] = useState(() => (isConvexConfigured ? visitorId() : ""));

  const data = useQuery(
    api.engagement.forPost,
    isConvexConfigured
      ? { postId: postId as Id<"posts">, visitorId: visitor }
      : "skip",
  );
  const toggleLike = useMutation(api.engagement.toggleLike);

  if (!isConvexConfigured) return null;

  const likes = data?.likes ?? 0;
  const liked = data?.liked ?? false;
  const comments = data?.comments ?? [];

  return (
    <section aria-label="Reactions and comments" className="mt-16">
      {/* Counts sit above the fold of this section and are always shown,
          including at zero. Hiding a zero count means the number only appears
          once you have interacted, so there is no way to tell the difference
          between "nobody has" and "this does not count anything". Both read
          live — Convex queries are reactive, so another visitor's like lands
          here without a refresh. */}
      <div className="hairline-t flex items-center gap-3 pt-8">
        <button
          type="button"
          onClick={() =>
            void toggleLike({ postId: postId as Id<"posts">, visitorId: visitor })
          }
          aria-pressed={liked}
          className={`flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition-colors duration-fast ${
            liked
              ? "border-[color:var(--accent)] text-accent"
              : "border-[color:var(--border-hairline)] text-secondary hover:text-primary"
          }`}
        >
          {/* Fills rather than swaps glyphs, so the state change reads as the
              same object changing rather than two different icons. */}
          <motion.svg
            viewBox="0 0 24 24"
            className="size-4"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
            animate={reduceMotion || !liked ? {} : { scale: [1, 1.25, 1] }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <path d="M12 20.5s-7.5-4.7-7.5-9.6a4.2 4.2 0 0 1 7.5-2.6 4.2 4.2 0 0 1 7.5 2.6c0 4.9-7.5 9.6-7.5 9.6Z" />
          </motion.svg>
          <span className="tabular-nums">{likes}</span>
          {liked ? "Liked" : "Like"}
        </button>

        <span className="text-sm text-secondary">
          <span className="tabular-nums">{comments.length}</span>{" "}
          {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      <div className="mt-10">
        <h2 className="text-lg text-primary">
          {comments.length > 0
            ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`
            : "Comments"}
        </h2>

        {comments.length > 0 ? (
          <ul className="mt-5 space-y-5">
            {comments.map((c) => (
              <li key={c._id} className="hairline-t pt-5 first:border-0 first:pt-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-primary">{c.name}</span>
                  <span className="shrink-0 text-xs text-secondary">
                    {new Date(c.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {/* pre-wrap keeps their line breaks; nothing else in what they
                    wrote is interpreted. */}
                <p className="mt-1.5 text-sm whitespace-pre-wrap text-secondary">
                  {c.body}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-secondary">
            Nothing here yet. Yours would be the first.
          </p>
        )}

        <CommentForm postId={postId} />
      </div>
    </section>
  );
}

function CommentForm({ postId }: { postId: string }) {
  const add = useMutation(api.engagement.addComment);

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const nameError = validateRequired(name, "your name");
  const bodyError = validateRequired(body, "a comment");
  const valid = !nameError && !bodyError;

  if (sent) {
    return (
      <p className="hairline-t mt-8 pt-6 text-sm text-secondary">
        Thank you — it will appear once I have read it.
      </p>
    );
  }

  return (
    <div className="hairline-t mt-8 space-y-4 pt-6">
      <p className="text-sm text-primary">Leave a comment</p>

      {/* Name and the comment itself. Asking for an email to say one line
          about a blog post is a wall in front of a low-stakes action, and the
          address was never used for anything. */}
      <div>
        <label htmlFor="c-name" className="text-xs text-secondary">
          Name
        </label>
        <input
          id="c-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-base text-primary sm:text-sm"
        />
        {touched.name ? <FieldError>{nameError}</FieldError> : null}
      </div>

      <div>
        <label htmlFor="c-body" className="text-xs text-secondary">
          Comment
        </label>
        <textarea
          id="c-body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, body: true }))}
          className="hairline mt-1.5 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-base text-primary sm:text-sm"
        />
        {touched.body ? <FieldError>{bodyError}</FieldError> : null}
      </div>

      <p className="text-xs text-secondary">
        Comments appear once I have read them.
      </p>

      <MiniSlide
        label="Slide to post"
        pendingLabel="Sending"
        doneLabel="Sent"
        ariaLabel="Slide to post your comment"
        disabled={!valid}
        onConfirm={async () => {
          setError(null);
          try {
            await add({ postId: postId as Id<"posts">, name, body });
            setSent(true);
          } catch {
            setError("That didn't send. Try again in a moment.");
            // Rethrown so the control rolls back rather than showing a tick
            // for something that failed.
            throw new Error("failed");
          }
        }}
      />

      <FieldError>{error}</FieldError>
    </div>
  );
}
