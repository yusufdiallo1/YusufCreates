import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, Button, brand } from "./components/Shell";

/**
 * Sent when I turn a project request down.
 *
 * Written to be read once and not resented. Three things do that work: it
 * says no in the first line rather than burying it, it confirms nothing was
 * charged, and it leaves the door open. Someone turned down this month may be
 * the right fit next quarter, and a decline that reads as a brush-off
 * guarantees they never come back.
 *
 * The reason is mine, in my own words, and it is the whole point of sending
 * this rather than just flipping a status. "Not a fit" explains nothing;
 * "this needs a booking engine I'd not build well in the time" tells them
 * what to ask for next, and often who to ask.
 *
 * When there IS a slot I could offer, this becomes a redirect rather than a
 * refusal — a no to now, not a no to the work.
 */
export function RequestDeclined({
  name,
  reason,
  /** Set when the answer is "not now" rather than "not this". */
  slotUrl,
}: {
  name: string;
  reason?: string;
  slotUrl?: string;
}) {
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  return (
    <Shell
      preview="I'm not taking this one on — nothing has been charged."
      footerNote="You're receiving this because you sent a project request through yusufcreates.com."
    >
      <H1>
        {greeting}
        {slotUrl ? "not right now, but maybe soon." : "I'm not the right fit for this one."}
      </H1>

      <P>
        {slotUrl
          ? "I've read your brief properly and I'd like to build it — I just don't have the room to do it justice at the moment."
          : "I've read your brief properly, and it isn't something I'd do well. I'd rather say that now than take it on and hand you something I'm not happy to put my name to."}
      </P>

      <P>
        <strong>Nothing has been charged.</strong> There&apos;s no invoice, no
        deposit, and nothing for you to cancel.
      </P>

      {reason ? (
        <Section
          style={{
            backgroundColor: brand.surface,
            borderRadius: "14px",
            padding: "20px",
            margin: "24px 0",
          }}
        >
          <P>{reason}</P>
        </Section>
      ) : null}

      {slotUrl ? (
        <>
          <P>
            If the timing works, hold a slot and I&apos;ll pick this up then.
          </P>
          <Button href={slotUrl}>Hold a slot</Button>
        </>
      ) : null}

      <Muted>
        If you think I&apos;ve misread it, reply to this email — it comes
        straight to me and I do read them.
      </Muted>
    </Shell>
  );
}

export default RequestDeclined;
