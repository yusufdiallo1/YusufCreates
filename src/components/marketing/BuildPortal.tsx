"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMutation, useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { BuildPayment } from "@/components/marketing/BuildPayment";

/**
 * The client portal for a build.
 *
 * One portal for every plan. Express counts down two hours; everything else
 * counts down to the delivery date agreed at approval. The difference is the
 * clock, not the layout — a client on a six-week build wants the same three
 * things as one on a two-hour build: how long, what is happening, and a way
 * to say something.
 *
 * Reached by token, with no account. Requiring someone to register before
 * they can ask "can the logo be bigger?" is how a quick question becomes an
 * email, and then a delay.
 */

type Section = "overview" | "chat" | "payment" | "brief";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "chat", label: "Messages" },
  { id: "payment", label: "Payment" },
  { id: "brief", label: "Your brief" },
];

/**
 * Counts down to a fixed instant.
 *
 * The instant comes from the server. A deadline computed in the browser is a
 * deadline a wrong clock can argue with, and this one decides who keeps money.
 */
function useCountdown(target: number | null) {
  // Rendered from state rather than read during render: Date.now() in a
  // render body makes the output depend on when React happens to run.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!target) return;
    // First tick scheduled rather than written synchronously — a setState in
    // an effect body cascades an extra render before paint, and a clock that
    // ticks in seconds cannot show the difference.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [target]);

  if (!target || now === null) return null;

  const remaining = target - now;
  const late = remaining <= 0;
  const abs = Math.abs(remaining);

  return {
    late,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
    totalMs: abs,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The clock as a sentence, for screen readers.
 *
 * "05:30:12" is announced as digits and colons, which is not a duration.
 * Seconds are dropped once there are hours left: at that range they are
 * noise, and the value is read on demand rather than live, so by the time
 * anyone hears it the seconds figure is already stale.
 */
function spoken(clock: {
  late: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}) {
  const unit = (n: number, word: string) =>
    n === 1 ? `1 ${word}` : `${n} ${word}s`;

  const parts: string[] = [];
  if (clock.days > 0) parts.push(unit(clock.days, "day"));
  if (clock.hours > 0) parts.push(unit(clock.hours, "hour"));
  if (clock.minutes > 0) parts.push(unit(clock.minutes, "minute"));
  if (clock.days === 0 && clock.hours === 0) {
    parts.push(unit(clock.seconds, "second"));
  }

  const spread = parts.join(", ");
  return clock.late ? `${spread} past the deadline` : `${spread} remaining`;
}

export function BuildPortal({ token }: { token: string }) {
  const reduceMotion = useReducedMotion();
  const [section, setSection] = useState<Section>("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const build = useQuery(
    api.express.byToken,
    isConvexConfigured ? { token } : "skip",
  );

  if (build === undefined) {
    return <p className="py-24 text-center text-sm text-secondary">Loading…</p>;
  }

  if (build === null) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl text-primary">Nothing here</h1>
        <p className="mt-3 text-sm text-secondary">
          That link is not one of mine. Check it came from the confirmation
          email.
        </p>
      </div>
    );
  }

  const isExpress = (build.plan ?? "express") === "express";

  /*
   * Before I have read it, the portal is ONE page and nothing else.
   *
   * A brief awaiting a decision has nothing to pay, no clock, and nothing to
   * discuss — showing four tabs where three are dead ends invites someone to
   * go looking for a pay button that should not exist yet. The nav appears
   * when approval makes it mean something.
   */
  if (build.status === "pending_approval" || build.status === "declined") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-5 py-16 text-center">
        <p className="text-xs tracking-normal text-secondary uppercase">
          {isExpress ? "Express build" : "Your project"}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl">{build.name}</h1>

        {build.status === "declined" ? (
          <>
            <p className="mt-6 text-primary">I could not take this one on.</p>
            <p className="mt-3 text-sm text-secondary">
              I have read it and it is not something I can do properly in the
              time. Nothing has been charged.
            </p>
            {build.declineNote ? (
              <p className="mt-4 border-l-2 border-[color:var(--hairline)] pl-4 text-left text-sm whitespace-pre-wrap text-secondary">
                {build.declineNote}
              </p>
            ) : null}
            <p className="mt-4 text-sm text-secondary">
              Reply to the email if you want to talk about a different scope.
            </p>
          </>
        ) : (
          <>
            <p className="mt-6 text-primary">I have your brief.</p>
            <p className="mt-3 text-sm text-secondary">
              I read every one myself. You will get an email the moment I have
              accepted it, and this page becomes your project — payment,
              progress and a way to message me.
            </p>
            <p className="mt-6 text-sm text-secondary">
              Nothing is owed until then, and no clock is running.
            </p>
          </>
        )}

        <div className="hairline mt-10 rounded-xl bg-surface-1 p-5 text-left">
          <p className="text-xs tracking-normal text-secondary uppercase">
            What you asked for
          </p>
          <p className="mt-2 text-sm whitespace-pre-wrap text-secondary">
            {build.brief}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-14">
      {/* Header. Doubles as the mobile menu trigger, so the nav never costs
          vertical space on a phone that the content could use. */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs tracking-normal text-secondary uppercase">
            {isExpress ? "Express build" : "Your project"}
          </p>
          <h1 className="mt-1 truncate text-2xl sm:text-3xl">{build.name}</h1>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="portal-menu"
          className="hairline min-h-11 shrink-0 rounded-full px-4 text-sm text-primary lg:hidden"
        >
          {SECTIONS.find((s) => s.id === section)?.label}
        </button>
      </div>

      <div className="mt-8 gap-10 lg:flex">
        {/* Desktop: a persistent side nav. Mobile: the same list, revealed
            from the header button. */}
        <nav className="hidden w-48 shrink-0 lg:block">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <SectionButton
                  active={section === s.id}
                  onClick={() => setSection(s.id)}
                  label={s.label}
                  badge={s.id === "chat" ? <UnreadDot token={token} /> : null}
                />
              </li>
            ))}
          </ul>
        </nav>

        <AnimatePresence>
          {menuOpen ? (
            <motion.ul
              id="portal-menu"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 space-y-1 overflow-hidden lg:hidden"
            >
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <SectionButton
                    active={section === s.id}
                    onClick={() => {
                      setSection(s.id);
                      setMenuOpen(false);
                    }}
                    label={s.label}
                    badge={s.id === "chat" ? <UnreadDot token={token} /> : null}
                  />
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>

        <div className="min-w-0 flex-1">
          {section === "overview" ? (
            <Overview build={build} isExpress={isExpress} token={token} />
          ) : null}
          {section === "chat" ? <Chat token={token} /> : null}
          {section === "payment" ? (
            <BuildPayment token={token} build={build} />
          ) : null}
          {section === "brief" ? <Brief build={build} /> : null}
        </div>
      </div>
    </div>
  );
}

function SectionButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3.5 text-left text-sm transition-colors duration-hover ease-hover ${
        active
          ? "bg-surface-2 text-primary"
          : "text-secondary hover:text-primary"
      }`}
    >
      {label}
      {badge}
    </button>
  );
}

/** A dot when I have replied and they have not looked yet. */
function UnreadDot({ token }: { token: string }) {
  const messages = useQuery(
    api.express.messages,
    isConvexConfigured ? { token } : "skip",
  );
  const unread = (messages ?? []).filter((m) => !m.fromClient && !m.readAt);
  if (unread.length === 0) return null;
  return (
    <span className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-[color:var(--accent)] text-[10px] font-medium text-primary">
      {unread.length}
    </span>
  );
}

type Build = NonNullable<
  ReturnType<typeof useQuery<typeof api.express.byToken>>
>;

function Overview({
  build,
  isExpress,
  token,
}: {
  build: Build;
  isExpress: boolean;
  token: string;
}) {
  const reduceMotion = useReducedMotion();
  // Express counts to the stored dueAt; every other plan to the agreed date.
  const target = isExpress ? build.dueAt : build.deliveryDate;
  const clock = useCountdown(build.status === "building" ? target : null);

  const money = (minor: number) =>
    (minor / 100).toLocaleString("en-US", {
      style: "currency",
      currency: build.currency.toUpperCase(),
    });

  return (
    <div className="space-y-6">
      {build.status === "pending_approval" ? (
        <Card title="Waiting on me">
          I have your brief and I am reading it. You will get an email the
          moment I have accepted it — nothing is owed until then, and no clock
          is running.
        </Card>
      ) : null}

      {build.status === "declined" ? (
        <Card title="I could not take this one">
          I have read it and it is not something I can do properly in the
          time. Nothing has been charged.
          {build.declineNote ? (
            // The same words the email carried. Shown here too so deleting
            // the email does not lose the reason.
            <span className="mt-3 block border-l-2 border-[color:var(--hairline)] pl-4 whitespace-pre-wrap">
              {build.declineNote}
            </span>
          ) : null}
          <span className="mt-3 block">
            Reply to the email if you want to talk about a different scope.
          </span>
        </Card>
      ) : null}

      {build.status === "awaiting_payment" ? (
        <Card title="Accepted — ready when you are">
          {/*
            The percentage is only mentioned when there is a total to take it
            of. 0/0 is NaN, and "The NaN% deposit is $0.00" is what a build
            with nothing to pay would otherwise print.
          */}
          {isExpress && build.depositAmount + build.balanceAmount > 0
            ? `The ${Math.round((build.depositAmount / (build.depositAmount + build.balanceAmount)) * 100)}% deposit is ${money(build.depositAmount)}. The two hours start the moment it clears, not before, so pay when you are ready for me to begin.`
            : `The deposit is ${money(build.depositAmount)}. I start as soon as it clears.`}
        </Card>
      ) : null}

      {/*
        Paid, and waiting on me to start the clock.

        This state had NO card at all, and it is the one that follows a
        successful payment — express.ts sets it the moment the deposit
        clears. The reactive query pushed the new status and every branch
        here went false, so the client watched the page empty itself
        seconds after paying. Silence is the worst possible answer to
        "did my money arrive".
      */}
      {build.status === "paid_review" ? (
        <Card title="Paid — thank you">
          Your payment has arrived and your place is held. I look over every
          brief before the clock starts, so the countdown begins when I have
          checked it rather than the moment the card cleared
          {isExpress ? ", and never while you would be asleep" : ""}. You will
          get an email the moment it does.
        </Card>
      ) : null}

      {/* Paid and in the queue, but not yet started. */}
      {build.status === "queued" ? (
        <Card title="In the queue">
          Paid and queued. I will email you the moment I start, and the
          countdown appears here as soon as it is running.
        </Card>
      ) : null}

      {/* Both terminal states. Neither had a card, so a cancelled or expired
          request also showed an empty page. */}
      {build.status === "cancelled" ? (
        <Card title="Cancelled">
          This request has been cancelled and nothing further is owed. If that
          is not what you expected, reply to any email from me and I will sort
          it out.
        </Card>
      ) : null}

      {build.status === "expired" ? (
        <Card title="This one timed out">
          The deposit was never paid, so the slot was released. Nothing was
          charged. If you still want it built, reply to any email from me and
          I will set it up again.
        </Card>
      ) : null}

      {/* The clock.
          Fades up once when it first resolves. The countdown renders null
          until the first tick lands, so without this the card appears
          abruptly a frame after everything else — which on the one element
          the client came here to look at reads as a glitch. */}
      {clock && build.status === "building" ? (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="hairline flex flex-col items-center rounded-xl bg-surface-1 px-6 py-10"
        >
          <p className="text-xs tracking-normal text-secondary uppercase">
            {clock.late ? "Past the deadline" : "Time remaining"}
          </p>

          <div
            className={`mt-4 text-4xl sm:text-5xl ${
              clock.late ? "text-[color:var(--danger)]" : "text-primary"
            }`}
          >
            {clock.late ? "−" : ""}
            <RollingNumber
              height="1.1em"
              value={
                clock.days > 0
                  ? `${clock.days}d ${pad(clock.hours)}:${pad(clock.minutes)}`
                  : `${pad(clock.hours)}:${pad(clock.minutes)}:${pad(clock.seconds)}`
              }
              label={spoken(clock)}
            />
          </div>

          <p className="mt-4 text-center text-sm text-secondary">
            {clock.late
              ? isExpress
                ? "I missed the window. The balance is yours to keep and you still get the site."
                : "I am past the agreed date. Message me and I will tell you exactly where it is."
              : "I am building it now."}
          </p>

          {build.previewUrl ? (
            <a
              href={build.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
            >
              See it so far
            </a>
          ) : null}
        </motion.div>
      ) : null}

      {/* Asked here, while the portal is still open and the work has just
          landed — the only moment someone will write about it. Never a
          condition of delivery: it appears after the site is handed over, not
          in front of it. */}
      {build.status === "delivered" ? <TestimonialInvite token={token} /> : null}

      {build.status === "delivered" ? (
        <Card
          title={
            /* Skipped comes first: a build I waived is not a build I was
               late on, even though both leave nothing to pay. */
            build.paymentSkipped
              ? "Delivered"
              : build.balanceWaived
                ? "Delivered late"
                : build.deliveredLocked
                  ? "Ready for you"
                  : "Delivered"
          }
        >
          {build.paymentSkipped
            ? "It is yours — there was nothing to pay on this one. The link is below."
            : build.balanceWaived
            ? `I missed the window, so the remaining ${money(build.balanceAmount)} is written off. You owe nothing further.`
            : build.deliveredLocked
              ? `It is built and waiting. The remaining ${money(build.balanceAmount)} releases it — pay on the Payment tab and the link appears here straight away.`
              : `The remaining ${money(build.balanceAmount)} is settled. It is all yours.`}

          {/* The preview stays available while the balance is outstanding.
              They should be able to see what they are paying to unlock —
              withholding the view as well as the site reads as a hostage
              rather than a payment term. */}
          {build.deliveredLocked && build.previewUrl ? (
            <a
              href={build.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hairline mt-5 inline-block rounded-full px-5 py-2.5 text-sm text-primary transition-opacity duration-hover ease-hover hover:opacity-80"
            >
              See the preview
            </a>
          ) : null}

          {build.deliveredUrl ? (
            <a
              href={build.deliveredUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
            >
              Open your site
            </a>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Offers the testimonial, once.
 *
 * The token is minted on demand rather than at delivery, so a client who
 * never opens their portal never has a dangling invitation sitting in the
 * database waiting to be guessed.
 */
function TestimonialInvite({ token }: { token: string }) {
  const invite = useMutation(api.express.inviteTestimonial);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (link) {
    return (
      <div className="hairline rounded-xl bg-surface-1 p-6">
        <p className="text-primary">Thank you</p>
        <p className="mt-2 text-sm text-secondary">
          The form is open in a new tab. Nothing else is needed from you.
        </p>
      </div>
    );
  }

  return (
    <div className="hairline rounded-xl bg-surface-1 p-6">
      <p className="text-primary">Would you say a few words?</p>
      <p className="mt-2 text-sm text-secondary">
        Only if you want to — it changes nothing either way. A couple of honest
        sentences helps the next person decide.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void invite({ token })
            .then((res) => {
              if (!res?.token) return;
              const url = `/testimonial/${res.token}`;
              setLink(url);
              window.open(url, "_blank", "noopener");
            })
            .finally(() => setBusy(false));
        }}
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Opening…" : "Leave a testimonial"}
      </button>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hairline rounded-xl bg-surface-1 p-6">
      <p className="text-primary">{title}</p>
      <div className="mt-2 text-sm text-secondary">{children}</div>
    </div>
  );
}

function Brief({ build }: { build: Build }) {
  const money = (minor: number) =>
    (minor / 100).toLocaleString("en-US", {
      style: "currency",
      currency: build.currency.toUpperCase(),
    });

  return (
    <div className="hairline rounded-xl bg-surface-1 p-6">
      <h2 className="text-xs tracking-normal text-secondary uppercase">
        What you asked for
      </h2>
      <p className="mt-3 text-sm whitespace-pre-wrap text-secondary">
        {build.brief}
      </p>
      <p className="mt-5 text-xs text-secondary">
        {build.pages} {build.pages === 1 ? "page" : "pages"} ·{" "}
        {build.depositPaidAt
          ? `${money(build.depositAmount)} paid`
          : `${money(build.depositAmount)} to start`}{" "}
        ·{" "}
        {build.balanceWaived
          ? "balance waived"
          : `${money(build.balanceAmount)} on delivery`}
      </p>
    </div>
  );
}

function Chat({ token }: { token: string }) {
  const messages = useQuery(
    api.express.messages,
    isConvexConfigured ? { token } : "skip",
  );
  const send = useMutation(api.express.sendMessage);
  const markRead = useMutation(api.express.markMessagesRead);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Pinned to the newest message, the way every chat behaves.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  const list = messages ?? [];
  const unreadCount = list.filter((m) => !m.fromClient && !m.readAt).length;

  /*
   * Opening this section IS reading them — there is no separate "mark read"
   * for someone to forget to press. Keyed on the count rather than on the
   * message array, so it fires when something new arrives while the tab is
   * already open, but not on every unrelated re-render of the thread.
   */
  useEffect(() => {
    if (!isConvexConfigured || unreadCount === 0) return;
    void markRead({ token });
  }, [token, unreadCount, markRead]);

  return (
    /*
     * Height is capped by the viewport, not fixed.
     *
     * A fixed 26rem cannot shrink, so when the on-screen keyboard opened it
     * pushed the input off the bottom of the screen — you were typing into a
     * field you could not see. The layout already sets
     * `interactiveWidget: "resizes-content"`, which makes dvh track the space
     * the keyboard leaves behind; this just has to be sized in it.
     *
     * min-h keeps it usable on a short landscape screen, where 60dvh alone
     * would collapse the log to a couple of lines.
     */
    <div
      className="hairline flex flex-col rounded-xl bg-surface-1"
      style={{ height: "min(26rem, 60dvh)", minHeight: "16rem" }}
    >
      <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {list.length === 0 ? (
          <p className="text-sm text-secondary">
            Anything you need changed, ask here. I read these while I am
            building, so it is faster than email.
          </p>
        ) : (
          list.map((m) => (
            <div
              key={m._id}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.fromClient
                  ? "ml-auto bg-[color:var(--accent)] text-primary"
                  : "bg-surface-2 text-primary"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body || busy) return;
          setBusy(true);
          setDraft("");
          void send({ token, body }).finally(() => setBusy(false));
        }}
        className="hairline-t flex items-center gap-2 p-3"
      >
        <label htmlFor="portal-chat" className="sr-only">
          Your message
        </label>
        <input
          id="portal-chat"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask for a change…"
          /* 16px so iOS does not zoom the page when it takes focus. */
          className="hairline min-w-0 flex-1 rounded-full bg-surface-2 px-4 py-2.5 text-base text-primary placeholder:text-secondary sm:text-sm"
        />
        <button
          type="submit"
          disabled={busy || draft.trim() === ""}
          className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
