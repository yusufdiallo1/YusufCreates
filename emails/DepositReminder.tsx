import { Shell, H1, P, Muted, Button } from "./components/Shell";

/**
 * A nudge when an approved request has not been paid for.
 *
 * Written as a reminder, not a chase. The most likely reason nobody has paid
 * is that the first email got buried, and treating that as reluctance is how
 * a routine nudge reads as pressure.
 *
 * It states the expiry plainly because a deadline nobody mentioned is a
 * deadline nobody can act on — and someone whose quote lapses silently is
 * right to be annoyed.
 */
export function DepositReminder({
  name,
  deposit,
  portalUrl,
  isExpress,
  daysLeft,
}: {
  name: string;
  /** Pre-formatted with its currency. */
  deposit: string;
  portalUrl: string;
  isExpress: boolean;
  daysLeft: number;
}) {
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  return (
    <Shell
      preview={`Your project is still waiting on the ${deposit} deposit.`}
      footerNote="You're receiving this because you sent a request through yusufcreates.com."
    >
      <H1>{greeting}still holding your slot.</H1>

      <P>
        I accepted your brief a couple of days ago and the {deposit} deposit
        has not come through yet. No rush from my side — I am just making sure
        the email did not get buried.
      </P>

      {isExpress ? (
        <P>
          Nothing is running yet. <strong>The two hours start when the
          deposit clears</strong>, not before, so pay whenever you are ready
          for me to begin.
        </P>
      ) : (
        <P>I start as soon as it clears.</P>
      )}

      <Button href={portalUrl}>Open your portal</Button>

      <Muted>
        If you have changed your mind that is completely fine — just ignore
        this and it will close itself in {daysLeft}{" "}
        {daysLeft === 1 ? "day" : "days"}. Nothing has been charged.
      </Muted>
    </Shell>
  );
}

export default DepositReminder;
