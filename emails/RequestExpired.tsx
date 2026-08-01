import { Shell, H1, P, Muted } from "./components/Shell";

/**
 * Sent when an approved request ages out unpaid.
 *
 * Expiring silently would be the worse failure: the client goes on believing
 * they have a live quote, and finds out only when they try to use it. Saying
 * so costs one email and leaves the relationship intact.
 *
 * Deliberately not a last-chance pitch. They had a week and did not pay,
 * which usually means the plan changed rather than that they need persuading
 * — so this closes the loop cleanly and makes coming back easy.
 */
export function RequestExpired({ name }: { name: string }) {
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  return (
    <Shell
      preview="I've closed your request. Nothing was charged."
      footerNote="You're receiving this because you sent a request through yusufcreates.com."
    >
      <H1>{greeting}I&apos;ve closed this one off.</H1>

      <P>
        The deposit never came through, so I have released the slot rather than
        leave it sitting open. <strong>Nothing has been charged</strong> — there
        is no invoice and nothing for you to cancel.
      </P>

      <P>
        No problem at all if the plan changed. If you still want it, reply to
        this email and I will pick it straight back up — you do not need to
        fill the form in again.
      </P>

      <Muted>Your original brief is kept, so nothing is lost.</Muted>
    </Shell>
  );
}

export default RequestExpired;
