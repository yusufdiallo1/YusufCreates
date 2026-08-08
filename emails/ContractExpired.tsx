import { Shell, H1, P, Muted } from "./components/Shell";

/**
 * The contract lapsed without being signed.
 *
 * Sent rather than passed over in silence, for the same reason the express
 * expiry email exists: the client believes they still have a live agreement,
 * and finding out by clicking a dead link weeks later is worse than being
 * told. It is also the cheapest re-opening there is — most lapses are a buried
 * email, not a decision.
 *
 * No link. The old one no longer works, and sending a dead link is what makes
 * this feel like an automated brush-off.
 */
export function ContractExpired({ name }: { name: string }) {
  const first = name.trim().split(/\s+/)[0] || "there";

  return (
    <Shell
      preview="Your contract link has expired"
      footerNote="Sent because a contract was issued to you and not signed within 14 days."
    >
      <H1>That contract link has expired</H1>

      <P>
        Hi {first} — contracts stay open for 14 days and that one has now
        lapsed, so the link will no longer open.
      </P>

      <P>
        Nothing is lost. If you still want to go ahead, reply to this email and
        I&apos;ll issue a fresh one — it takes a second, and the terms are
        unchanged.
      </P>

      <Muted>
        If the timing no longer works or you&apos;ve gone another way, no reply
        needed. It would be useful to know, but it is not expected.
      </Muted>
    </Shell>
  );
}

export default ContractExpired;
