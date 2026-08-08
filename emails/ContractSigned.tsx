import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, DetailRow, brand } from "./components/Shell";

/**
 * Their copy of what they signed.
 *
 * Sent AFTER the redirect to payment, from the queue rather than inline — an
 * email arriving between accepting and paying is a step, and every step in
 * that window is a place to cool off.
 *
 * It is also the ESIGN "retained, reproducible record" limb doing its work:
 * the person who signed has to be able to keep a copy, and pointing them at a
 * portal they may not have an account for yet does not count.
 */
export function ContractSigned({
  name,
  signedAt,
  bodyHash,
  portalUrl,
}: {
  name: string;
  signedAt: number;
  bodyHash: string;
  portalUrl: string;
}) {
  const first = name.trim().split(/\s+/)[0] || "there";
  const when = new Date(signedAt).toISOString().replace("T", " ").slice(0, 19);

  return (
    <Shell
      preview="Your signed contract"
      footerNote="Keep this email — it is your record of what was agreed and when."
    >
      <H1>Your signed contract</H1>

      <P>
        Hi {first} — that&apos;s signed and filed. Here are the details for your
        records.
      </P>

      <Section
        style={{
          backgroundColor: brand.surface,
          borderRadius: "8px",
          padding: "18px 20px",
          margin: "0 0 20px",
        }}
      >
        <DetailRow label="Signed" value={`${when} UTC`} />
        <DetailRow label="Signed by" value={name} />
        <DetailRow label="Fingerprint" value={bodyHash.slice(0, 32)} />
      </Section>

      <P>
        That fingerprint is a hash of the exact text you agreed to. If a single
        character of it were altered, the fingerprint would no longer match —
        which is what makes the copy you hold as good as the one I hold.
      </P>

      <P>
        The full PDF, including the signature record, is in your portal at{" "}
        {portalUrl}. It stays there permanently.
      </P>

      <Muted>
        If anything in the agreement does not match what you expected, reply to
        this email straight away rather than paying the deposit.
      </Muted>
    </Shell>
  );
}

export default ContractSigned;
