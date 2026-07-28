import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, DetailRow, brand } from "./components/Shell";

/**
 * Sent to the person who submitted an enquiry.
 *
 * Its job is to close the loop and set an expectation — not to sell. The
 * summary is echoed back so they have a record of what they sent, which also
 * makes an obvious wrong answer easy to spot and correct by replying.
 */
export function LeadConfirmation({
  name,
  planLabel,
  summary = [],
  replyWithin = "one working day",
}: {
  name: string;
  planLabel?: string;
  summary?: { label: string; value: string }[];
  replyWithin?: string;
}) {
  const first = name.trim().split(/\s+/)[0] || "there";

  return (
    <Shell
      preview={`Thanks ${first} — I've got your enquiry and I'll reply within ${replyWithin}.`}
      footerNote="You're receiving this because you sent an enquiry through yusufcreates.com."
    >
      <H1>Thanks {first} — that&apos;s with me.</H1>

      <P>
        I read every enquiry myself, and I&apos;ll come back to you within{" "}
        {replyWithin}. If it turns out I&apos;m not the right person for this,
        I&apos;ll say so and point you somewhere better.
      </P>

      {summary.length > 0 ? (
        <Section
          style={{
            backgroundColor: brand.surface,
            borderRadius: "8px",
            padding: "18px 20px",
            margin: "0 0 20px",
          }}
        >
          {planLabel ? <DetailRow label="Project" value={planLabel} /> : null}
          {summary.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </Section>
      ) : null}

      <Muted>
        Something wrong above, or want to add anything? Just reply to this
        email — it comes straight to me.
      </Muted>
    </Shell>
  );
}

export default LeadConfirmation;
