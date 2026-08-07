"use client";

import { useEffect, useRef, useState } from "react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { Logo } from "@/components/ui/Logo";
import { PayPanel } from "@/components/portal/PayPanel";
import { ProgressRing } from "@/components/portal/ProgressRing";
import { TypingBubbles } from "@/components/ui/TypingBubbles";
import { CallsPanel } from "@/components/calls/CallsPanel";
import { Insights } from "@/components/portal/Insights";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Client portal.
 *
 * Everything shown here is derived from the authenticated session — the
 * component never asks for a project by id, because a client-supplied id is
 * exactly what must not be trusted. The server decides what this person can
 * see and returns only that.
 *
 * Realtime comes free: useQuery is reactive, so a milestone I mark done or a
 * reply I post appears without a refresh.
 */
export function Portal() {
  if (!isConvexConfigured) {
    return (
      <Shell>
        <p className="text-sm text-secondary">
          The portal is not configured yet.
        </p>
      </Shell>
    );
  }

  return (
    <>
      <AuthLoading>
        <Shell>
          <p className="text-sm text-secondary">Checking…</p>
        </Shell>
      </AuthLoading>

      <Unauthenticated>
        <Shell>
          <h1 className="text-2xl">Client portal</h1>
          <p className="mt-3 text-sm text-secondary">
            This is where your project status, files and invoices live. Use the
            link from your welcome email to sign in — if you have lost it, reply
            to any email from me and I will send a fresh one.
          </p>
        </Shell>
      </Unauthenticated>

      <Authenticated>
        <PortalContent />
      </Authenticated>
    </>
  );
}

function PortalContent() {
  const data = useQuery(api.portal.overview, {});
  const invoices = useQuery(api.portal.invoices, {});
  const [active, setActive] = useState<Id<"clientProjects"> | null>(null);
  /** Which invoice has its payment panel open. Only one at a time. */
  const [paying, setPaying] = useState<string | null>(null);

  if (data === undefined) {
    return (
      <Shell>
        <p className="text-sm text-secondary">Loading your projects…</p>
      </Shell>
    );
  }

  const current = active ?? data.projects[0]?._id ?? null;

  /*
   * Before the deposit, the portal is one thing: the invoice.
   *
   * Returning early rather than conditionally hiding four sections. A page
   * that renders everything and then suppresses most of it still fetches it
   * all, still ships it to the browser, and grows a new leak every time a
   * section is added and somebody forgets the guard. One branch, one thing on
   * screen, nothing to forget.
   */
  if (data.access.locked) {
    return (
      <Shell>
        <h1 className="text-2xl">Hello {data.name.split(" ")[0]}</h1>
        <p className="mt-3 text-sm text-secondary">
          {data.access.overdue
            ? "The deposit invoice is past due. Settling it reopens the project."
            : "One thing first — the deposit. Once it clears, this page becomes your project: progress, files, direct chat and calls."}
        </p>

        {invoices && invoices.length > 0 ? (
          <div className="mt-8">
            <Invoices
              invoices={invoices}
              paying={paying}
              setPaying={setPaying}
            />
          </div>
        ) : (
          <p className="mt-8 text-sm text-secondary">
            The invoice is on its way. Refresh in a moment.
          </p>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl">Hello {data.name.split(" ")[0]}</h1>

      {data.projects.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">
          Nothing here yet. Once a project starts you will see its progress,
          files and invoices on this page.
        </p>
      ) : (
        <>
          {data.projects.length > 1 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {data.projects.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => setActive(p._id)}
                  aria-pressed={current === p._id}
                  className={`hairline rounded-full px-3.5 py-1.5 text-xs ${
                    current === p._id
                      ? "bg-surface-2 text-primary"
                      : "text-secondary"
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          ) : null}

          {data.projects
            .filter((p) => p._id === current)
            .map((project) => (
              <div key={project._id} className="mt-8 space-y-10">
                <section aria-labelledby="progress-heading">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <h2 id="progress-heading" className="text-lg">
                        {project.title}
                      </h2>
                      <p className="mt-1 text-sm text-secondary">
                        {project.milestones.filter((m) => m.status === "done")
                          .length}{" "}
                        of {project.milestones.length} done
                      </p>
                    </div>

                    {/* A ring rather than the bar that was here. Same number,
                        but it charges toward the accent as it fills instead of
                        just getting longer — see ProgressRing. */}
                    <ProgressRing
                      value={project.percentComplete}
                      label={project.title}
                    />
                  </div>

                  {/* Deliberately NOT animated on load. This is reference
                      information — what is done and what is next — and a list
                      that assembles itself is a list you cannot scan until it
                      has finished. */}
                  <ol className="mt-6 space-y-3">
                    {project.milestones.map((m) => (
                      <li key={m._id} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 size-2 shrink-0 rounded-full ${
                            m.status === "done"
                              ? "bg-[color:var(--accent)]"
                              : m.status === "in_progress"
                                ? "bg-[color:var(--text-notice)]"
                                : "bg-surface-3"
                          }`}
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-sm ${
                              m.status === "done"
                                ? "text-secondary line-through"
                                : "text-primary"
                            }`}
                          >
                            {m.title}
                            <span className="sr-only">
                              {" — "}
                              {m.status === "done"
                                ? "complete"
                                : m.status === "in_progress"
                                  ? "in progress"
                                  : "not started"}
                            </span>
                          </p>
                          {m.description ? (
                            <p className="mt-0.5 text-xs text-secondary">
                              {m.description}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                    {project.milestones.length === 0 ? (
                      <li className="text-sm text-secondary">
                        Milestones appear here as soon as the plan is set.
                      </li>
                    ) : null}
                  </ol>
                </section>

                <Insights projectId={project._id} />
                <Activity project={project} />
                <Deliverables projectId={project._id} />
                <CallsPanel projectId={project._id} />
                <Messages projectId={project._id} />
              </div>
            ))}
        </>
      )}

      {invoices && invoices.length > 0 ? (
        <div className="mt-12">
          <Invoices invoices={invoices} paying={paying} setPaying={setPaying} />
        </div>
      ) : null}
    </Shell>
  );
}

/**
 * The invoice list.
 *
 * Extracted so the deposit gate above can render exactly this and nothing
 * else. Inline, the locked state would have had to duplicate every row, the
 * currency formatting and the embedded payment panel — three places to fix a
 * bug in the one part of the portal that handles money.
 */
function Invoices({
  invoices,
  paying,
  setPaying,
}: {
  invoices: {
    _id: string;
    reference: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
    stage: string;
    token: string;
  }[];
  paying: string | null;
  setPaying: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  return (
        <section aria-labelledby="invoices-heading">
          <h2 id="invoices-heading" className="text-lg">
            Invoices
          </h2>
          <ul className="mt-4 space-y-2">
            {invoices.map((inv) => (
              <li key={inv._id} className="hairline rounded-xl bg-surface-1">
                <div className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-primary">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: inv.currency || "USD",
                      maximumFractionDigits: 0,
                    }).format(inv.amount)}
                    <span className="ml-2 text-xs text-secondary">
                      {inv.reference}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {inv.stage === "deposit" ? "Deposit" : "Balance"} ·{" "}
                    {inv.description}
                  </p>
                </div>
                {inv.status === "paid" ? (
                  <span className="badge badge-warm shrink-0">paid</span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setPaying((cur) => (cur === inv._id ? null : inv._id))
                    }
                    aria-expanded={paying === inv._id}
                    className="shrink-0 rounded-full bg-[color:var(--accent-solid)] px-4 py-2 text-xs font-medium text-white transition-opacity duration-hover ease-hover hover:opacity-90"
                  >
                    {paying === inv._id ? "Close" : "Pay"}
                  </button>
                )}
                </div>

                {/* Payment opens in place. Sending a client to another domain
                    to hand over a deposit is the moment the whole thing feels
                    least like a business and most like a link someone sent. */}
                {paying === inv._id && inv.status !== "paid" ? (
                  <div className="border-t border-transparent px-4 pb-4">
                    <div className="rule mb-4" />
                    <PayPanel token={inv.token} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
  );
}

/** One thing that happened, and when. */
type Event = { id: string; at: number; text: string };

/**
 * Recent activity, newest first.
 *
 * DERIVED CLIENT-SIDE from data the portal already holds — milestone
 * completedAt, deliverable uploadedAt and approvedAt, message creation times.
 * No new query, no schema change, and nothing for a concurrent change to the
 * portal's server side to collide with.
 *
 * ARRIVALS PUSH THE LIST DOWN. Convex is reactive, so a milestone marked done
 * while the client happens to have this open lands here live, and that is the
 * single best moment in the portal — the thing they are paying for visibly
 * progressing while they watch. Making the existing rows move out of the way,
 * rather than having a new row materialise at the top, is the difference
 * between something arriving and the list simply being different.
 */
function Activity({
  project,
}: {
  project: {
    _id: Id<"clientProjects">;
    milestones: {
      _id: string;
      title: string;
      status: string;
      completedAt?: number;
    }[];
  };
}) {
  const files = useQuery(api.portal.deliverables, { projectId: project._id });
  const messages = useQuery(api.portal.messages, { projectId: project._id });

  const events: Event[] = [];

  for (const milestone of project.milestones) {
    if (milestone.status === "done" && milestone.completedAt) {
      events.push({
        id: `m-${milestone._id}`,
        at: milestone.completedAt,
        text: `${milestone.title} — done`,
      });
    }
  }

  for (const file of files ?? []) {
    events.push({
      id: `f-${file._id}`,
      at: file.uploadedAt,
      text: `${file.name} added`,
    });
    if (file.approvedAt) {
      events.push({
        id: `a-${file._id}`,
        at: file.approvedAt,
        text: `You approved ${file.name}`,
      });
    }
  }

  for (const message of messages ?? []) {
    if (message.authorType !== "admin") continue;
    events.push({
      id: `msg-${message._id}`,
      at: message._creationTime,
      text: `${message.authorName} replied`,
    });
  }

  // Newest first, and capped. A feed is a sense of momentum, not an audit log
  // — past a screen's worth it stops being read and starts being scrolled past.
  const recent = events.sort((a, b) => b.at - a.at).slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-lg">
        Recent activity
      </h2>

      {/* LayoutGroup so the rows measure against each other. Without it each
          item animates its own box in isolation and the push-down turns into
          eight things independently deciding to be somewhere else. */}
      <LayoutGroup>
        <ul className="mt-4 space-y-2">
          <AnimatePresence initial={false}>
            {recent.map((event) => (
              <motion.li
                key={event.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="hairline flex items-baseline justify-between gap-4 rounded-xl bg-surface-1 px-4 py-3"
              >
                <span className="min-w-0 text-sm text-primary">
                  {event.text}
                </span>
                <span className="shrink-0 text-xs text-secondary tabular-nums">
                  {new Date(event.at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>
    </section>
  );
}

function Deliverables({ projectId }: { projectId: Id<"clientProjects"> }) {
  const files = useQuery(api.portal.deliverables, { projectId });
  const approve = useMutation(api.portal.approveDeliverable);

  if (!files || files.length === 0) return null;

  return (
    <section aria-labelledby="files-heading">
      <h2 id="files-heading" className="text-lg">
        Files
      </h2>
      <ul className="mt-4 space-y-2">
        {files.map((file) => (
          <li
            key={file._id}
            className="hairline flex items-center justify-between gap-4 rounded-xl bg-surface-1 p-4"
          >
            <div className="min-w-0">
              <a
                href={file.url}
                className="text-sm text-primary hover:text-accent"
              >
                {file.name}
              </a>
              <p className="mt-0.5 text-xs text-secondary">
                v{file.version} ·{" "}
                {new Date(file.uploadedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            {file.approvedAt ? (
              <span className="badge badge-warm shrink-0">approved</span>
            ) : (
              <button
                type="button"
                onClick={() => void approve({ id: file._id })}
                className="hairline shrink-0 rounded-full px-3.5 py-1.5 text-xs text-primary"
              >
                Approve
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** An outgoing message that has been sent but has not come back yet. */
type Pending = { id: number; body: string };

function Messages({ projectId }: { projectId: Id<"clientProjects"> }) {
  const messages = useQuery(api.portal.messages, { projectId });
  const typing = useQuery(api.portal.typingState, { projectId });
  const post = useMutation(api.portal.postMessage);
  const markSeen = useMutation(api.portal.markThreadSeen);
  const setTyping = useMutation(api.portal.setTyping);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const pendingId = useRef(0);
  const reduceMotion = useReducedMotion();

  /*
   * Stamp delivered/read whenever the thread is on screen and something new
   * arrives. Depends on the message COUNT rather than the array, because the
   * array is a fresh object on every reactive tick and would loop forever.
   */
  const count = messages?.length ?? 0;
  useEffect(() => {
    if (count === 0) return;
    void markSeen({ projectId });
  }, [count, projectId, markSeen]);

  /*
   * Typing presence, throttled to one write per TTL rather than one per
   * keystroke. A mutation per character would be hundreds of writes to send a
   * sentence, for an indicator whose whole job is to be approximate.
   */
  const lastTypingPing = useRef(0);
  const onDraftChange = (value: string) => {
    setDraft(value);
    const now = Date.now();
    if (value.trim() === "") {
      lastTypingPing.current = 0;
      void setTyping({ projectId, typing: false });
      return;
    }
    if (now - lastTypingPing.current > 3000) {
      lastTypingPing.current = now;
      void setTyping({ projectId, typing: true });
    }
  };

  return (
    <section aria-labelledby="messages-heading">
      <h2 id="messages-heading" className="text-lg">
        Messages
      </h2>
      <p className="mt-1 text-xs text-secondary">
        Goes straight to me. Replies appear here without a refresh.
      </p>

      <ul className="mt-4 space-y-3">
        {(messages ?? []).map((m, index) => {
          const mine = m.authorType === "client";
          // Only the newest of my own messages carries a receipt. Stamping
          // every bubble turns a status into wallpaper — what you want to know
          // is whether the last thing you said landed.
          const isLastMine =
            mine &&
            !(messages ?? [])
              .slice(index + 1)
              .some((later) => later.authorType === "client");
          return (
            <motion.li
              key={m._id}
              /*
               * INCOMING messages land with a slight overshoot. A reply is news
               * — it arrived without you asking, and it should read as having
               * arrived rather than as having always been there.
               *
               * OUTGOING messages do not overshoot, and by the time one of
               * these renders it has already been on screen as a pending
               * bubble. You know you sent it. Announcing it back to you is the
               * interface talking to itself.
               */
              initial={
                reduceMotion || mine ? false : { scale: 0.96, opacity: 0 }
              }
              animate={{ scale: 1, opacity: 1 }}
              transition={
                mine
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 400, damping: 20 }
              }
              className={
                mine
                  ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-surface-2 px-4 py-2.5"
                  : "hairline w-fit max-w-[85%] rounded-2xl bg-surface-1 px-4 py-2.5"
              }
            >
              <p className="text-xs text-secondary">{m.authorName}</p>
              <p className="mt-1 text-sm whitespace-pre-wrap text-primary">
                {m.body}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
                <time dateTime={new Date(m.createdAt).toISOString()}>
                  {new Date(m.createdAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {isLastMine ? <Receipt message={m} /> : null}
              </p>
            </motion.li>
          );
        })}

        {/* In flight. Appears the instant you press send, in a state that says
            so, and is replaced by the real message when it comes back. Sending
            a message and watching nothing happen is what makes a chat feel
            unreliable even when it is not. */}
        {pending.map((item) => (
          <li
            key={`pending-${item.id}`}
            className="ml-auto w-fit max-w-[85%] rounded-2xl bg-surface-2 px-4 py-2.5 opacity-60"
          >
            <p className="flex items-center gap-2 text-xs text-secondary">
              <TypingBubbles label="Sending your message" />
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-primary">
              {item.body}
            </p>
          </li>
        ))}

        {/* Their end of the conversation, live. Sits in the list rather than
            above the composer so it appears where the next message will. */}
        {typing?.otherSideTyping ? (
          <li className="hairline w-fit rounded-2xl bg-surface-1 px-4 py-2.5">
            <TypingBubbles label="Yusuf is typing" />
          </li>
        ) : null}
      </ul>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body) return;
          setDraft("");
          // Clear presence immediately on send: the message itself is the
          // signal now, and leaving "typing…" up for the remaining TTL reads
          // as a second message that never arrives.
          lastTypingPing.current = 0;
          void setTyping({ projectId, typing: false });

          /*
           * The sending bubble stays up for a minimum beat.
           *
           * Convex mutations round-trip in roughly 50ms on a decent
           * connection, so the three-dot indicator was being mounted and
           * unmounted inside a single frame or two — the animation existed and
           * was never once seen. That reads as "nothing happened when I
           * pressed send", which is the exact anxiety the indicator is there
           * to remove.
           *
           * 420ms is long enough for the dots to complete most of one wave and
           * short enough that it never feels like waiting. It is a FLOOR, not
           * a delay: a genuinely slow send holds the bubble for as long as it
           * actually takes, because Promise.all resolves on the slower of the
           * two.
           */
          const id = pendingId.current++;
          setPending((current) => [...current, { id, body }]);

          const minimumVisible = new Promise((resolve) =>
            setTimeout(resolve, 420),
          );
          void Promise.all([post({ projectId, body }), minimumVisible]).finally(
            () => {
              setPending((current) => current.filter((p) => p.id !== id));
            },
          );
        }}
        className="mt-4 flex gap-2"
      >
        <label htmlFor="portal-msg" className="sr-only">
          Your message
        </label>
        <input
          id="portal-msg"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Ask something…"
          className="hairline min-w-0 flex-1 rounded-full bg-surface-1 px-4 py-2.5 text-sm text-primary placeholder:text-secondary"
        />
        <button
          type="submit"
          disabled={draft.trim() === ""}
          className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-canvas disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Logo variant="mark" className="h-7 w-auto" />
      <div className="mt-10">{children}</div>
    </main>
  );
}

/**
 * Sent → Delivered → Read, for the newest outgoing message.
 *
 * Words, not tick marks. A single grey tick and a double blue tick are a
 * convention people have learned from one specific app; outside it they are a
 * guess. This is a client waiting on a reply about their own project, and
 * three characters of plain English cost nothing.
 *
 * Rendered inside the timestamp row, so it reads as metadata about the message
 * rather than as a second message.
 */
function Receipt({
  message,
}: {
  message: { deliveredAt?: number; readAt?: number };
}) {
  const label = message.readAt
    ? "Read"
    : message.deliveredAt
      ? "Delivered"
      : "Sent";

  return (
    <>
      <span aria-hidden="true">·</span>
      <span className={message.readAt ? "text-accent" : undefined}>
        {label}
      </span>
    </>
  );
}
