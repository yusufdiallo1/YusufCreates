import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, Button, brand } from "./components/Shell";

/**
 * Sent when I accept a project request.
 *
 * The one email in the whole flow that has to do a job beyond informing:
 * it has to get someone to pay a deposit. So it says what happens next in
 * the order it will happen, and there is exactly one button.
 *
 * TWO SHAPES, one template. An instant start and a booked slot are the same
 * acceptance with a different next step — "the invoice is waiting" versus
 * "here is the month". Splitting them into two templates would mean two
 * places to change the deposit wording, which is the sentence most likely to
 * need changing.
 *
 * The deposit is named as a share and a consequence, not just a number: what
 * it unlocks is the portal, and saying so is what makes it feel like a step
 * rather than a toll.
 */
export function RequestAccepted({
  name,
  portalUrl,
  /** Present for a booked slot; absent for an instant start. */
  scheduledMonth,
  /** What they asked for, echoed back so this reads as a reply. */
  projectName,
}: {
  name: string;
  portalUrl: string;
  scheduledMonth?: string;
  projectName?: string;
}) {
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  // "2026-09" → "September 2026". Built here rather than passed in so the
  // caller never has to think about the reader's date format.
  const monthLabel = scheduledMonth
    ? new Date(`${scheduledMonth}-01T00:00:00Z`).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <Shell
      preview={
        monthLabel
          ? `Booked in for ${monthLabel}. Here's your portal.`
          : "Accepted — here's your portal and the deposit."
      }
      footerNote="You're receiving this because you asked me to build something through yusufcreates.com."
    >
      <H1>{greeting}yes, let&apos;s build it.</H1>

      <P>
        I&apos;ve read {projectName ? <strong>{projectName}</strong> : "your brief"}{" "}
        properly and I&apos;d like to take it on.
      </P>

      {monthLabel ? (
        <P>
          I&apos;ve booked you into <strong>{monthLabel}</strong>. That slot is
          yours — I don&apos;t take on more than I can finish, so nothing else
          gets sold into it.
        </P>
      ) : (
        <P>
          I can start now. Your portal is already set up and waiting.
        </P>
      )}

      <Section
        style={{
          backgroundColor: brand.surface,
          borderRadius: "14px",
          padding: "20px",
          margin: "24px 0",
        }}
      >
        <P>
          <strong>What happens next</strong>
        </P>
        <P>
          1. Pay the deposit — 40% of the total. It&apos;s the only thing in
          your portal right now.
        </P>
        <P>
          2. The portal opens up: live progress, every file, a direct line to
          me, and voice or video whenever you want it.
        </P>
        <P>
          3. {monthLabel ? `Work starts in ${monthLabel}.` : "I start."} The
          remaining 60% is due at the end, not before.
        </P>
      </Section>

      <Button href={portalUrl}>Open your portal</Button>

      <Muted>
        The link is tied to your email address — sign in with it and the portal
        knows who you are. If anything looks wrong, just reply to this email;
        it comes straight to me.
      </Muted>
    </Shell>
  );
}

export default RequestAccepted;
