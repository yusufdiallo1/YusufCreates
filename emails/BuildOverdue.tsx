import { Shell, H1, P, Muted } from "./components/Shell";

/**
 * Sent automatically when I miss the deadline.
 *
 * This is the promise the express build is sold on, so the email has to
 * arrive without me — the one person who cannot be relied upon to notice I am
 * late is me, and a waiver the client has to ask for is not a guarantee.
 *
 * It leads with what they get, not with an apology. Someone who has been
 * waiting wants the consequence first; the apology reads as sincere after it
 * and as deflection before it.
 */
export function BuildOverdue({
  name,
  balance,
  portalUrl,
  isExpress,
}: {
  name: string;
  /** Pre-formatted with its currency. */
  balance: string;
  portalUrl: string;
  isExpress: boolean;
}) {
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  return (
    <Shell
      preview={`I missed the deadline, so the remaining ${balance} is written off.`}
      footerNote="You're receiving this because you have a live project with me."
    >
      <H1>{greeting}I missed the deadline.</H1>

      <P>
        <strong>The remaining {balance} is written off.</strong> You will not
        be invoiced for it, and you still get the work.
      </P>

      <P>
        {isExpress
          ? "That is the deal on an express build: inside two hours you owe the balance, past it you do not. I am still finishing the site and you will have it shortly."
          : "I am past the date we agreed. I am still on it and you will have it shortly."}
      </P>

      <P>
        You can see where it is, and message me directly, on your portal:{" "}
        <a href={portalUrl} style={{ color: "#4c58c0" }}>
          {portalUrl}
        </a>
      </P>

      <Muted>
        This email was sent automatically the moment the deadline passed —
        nobody had to notice it for you.
      </Muted>
    </Shell>
  );
}

export default BuildOverdue;
