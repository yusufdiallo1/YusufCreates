import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, brand } from "./components/Shell";

/**
 * Sent when I turn a brief down.
 *
 * Written to be read once and not resented. Three things do that work: it
 * says no in the first line rather than burying it, it states plainly that
 * nothing was charged, and it leaves the door open. Someone I decline this
 * month may be the right fit next quarter, and a decline that reads as a
 * brush-off guarantees they never come back.
 *
 * The note is mine, in my own words, and it is the whole reason this email is
 * worth sending rather than just flipping a status. "Not a fit" explains
 * nothing; "this needs a booking system I would not build well in two hours"
 * tells them what to ask for next time — and often who to ask.
 */
export function BuildDeclined({
  name,
  note,
}: {
  name: string;
  /** Optional: sometimes there is nothing useful to add beyond no. */
  note?: string;
}) {
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  return (
    <Shell
      preview="I'm not taking this one on — nothing has been charged."
      footerNote="You're receiving this because you sent a brief through yusufcreates.com."
    >
      <H1>{greeting}I&apos;m not the right fit for this one.</H1>

      <P>
        I&apos;ve read your brief properly, and it isn&apos;t something I can
        do well in the time. I&apos;d rather say that now than take it on and
        deliver something I&apos;m not happy to put my name to.
      </P>

      <P>
        <strong>Nothing has been charged.</strong> There&apos;s no invoice, no
        deposit, and nothing for you to cancel.
      </P>

      {note ? (
        <Section
          style={{
            backgroundColor: brand.surface,
            borderLeft: `3px solid ${brand.hairline}`,
            borderRadius: "8px",
            padding: "16px 20px",
            margin: "0 0 20px",
          }}
        >
          <P>{note}</P>
        </Section>
      ) : null}

      <P>
        If the scope changes, or you want to talk through a version of this
        that would work, just reply — this comes straight to me.
      </P>

      <Muted>
        Your portal link still works and shows this decision, in case you want
        the record.
      </Muted>
    </Shell>
  );
}

export default BuildDeclined;
