import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, Button, DetailRow, brand } from "./components/Shell";

/**
 * Sent when I accept a brief.
 *
 * This email IS the gate opening. Until it lands the client has a portal that
 * shows their brief and no way to pay — so if it never sends, an approved job
 * sits waiting on someone who has no reason to look. That makes it the one
 * email in the flow whose absence silently stalls the work.
 *
 * For express it says plainly that the clock starts on payment. People assume
 * a deadline starts when the seller says yes; if they believe two hours are
 * already burning they will either rush or feel cheated, and both are avoided
 * by one sentence.
 */
export function BuildApproved({
  name,
  portalUrl,
  deposit,
  balance,
  isExpress,
  deliveryDate,
}: {
  name: string;
  portalUrl: string;
  /** Pre-formatted with its currency — the server owns the conversion. */
  deposit: string;
  balance: string;
  isExpress: boolean;
  /** Non-express only, already formatted for a human. */
  deliveryDate?: string;
}) {
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  return (
    <Shell
      preview={
        isExpress
          ? "I've taken your build on. The two hours start when you pay."
          : "I've taken your project on. Here's your portal."
      }
      footerNote="You're receiving this because you ordered a build at yusufcreates.com."
    >
      <H1>{greeting}I&apos;m taking it on.</H1>

      <P>
        I&apos;ve read your brief and it&apos;s something I can do properly.
        Your portal is live — that&apos;s where you pay, watch progress, and
        message me directly while I build.
      </P>

      <Section
        style={{
          backgroundColor: brand.surface,
          borderRadius: "8px",
          padding: "18px 20px",
          margin: "0 0 20px",
        }}
      >
        <DetailRow label="To start" value={deposit} />
        <DetailRow
          label={isExpress ? "On delivery, if I'm on time" : "On delivery"}
          value={balance}
        />
        {deliveryDate ? (
          <DetailRow label="Agreed delivery" value={deliveryDate} />
        ) : null}
      </Section>

      <Section style={{ margin: "0 0 24px" }}>
        <Button href={portalUrl}>Open your portal</Button>
      </Section>

      {isExpress ? (
        <P>
          <strong>The two hours start when your deposit clears</strong> — not
          now, and not when you open this. Pay when you&apos;re ready for me to
          begin. If I miss the window you keep the site and owe nothing
          further.
        </P>
      ) : (
        <P>I start as soon as the deposit clears.</P>
      )}

      <Muted>
        This link is the only way into your portal, so keep the email. Anyone
        who has it can see the project — don&apos;t forward it on.
      </Muted>
    </Shell>
  );
}

export default BuildApproved;
