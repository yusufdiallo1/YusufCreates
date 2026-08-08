import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, Button, DetailRow, brand } from "./components/Shell";

/**
 * Admin alert: read and not signed.
 *
 * The single most useful signal this feature produces. A contract that was
 * never opened is a delivery problem; a contract opened two days ago and left
 * unsigned is an objection somebody has not voiced, and it is the one state
 * here that wants a phone call rather than another email to the client.
 *
 * Goes to the admin, not the client. Chasing the client automatically at 48
 * hours would be the wrong move — the point is to prompt a human decision
 * about how to handle it.
 */
export function ContractStale({
  clientName,
  amount,
  currency,
  viewedAt,
  hoursSinceViewed,
  adminUrl,
}: {
  clientName: string;
  amount: number;
  currency: string;
  viewedAt: number | null;
  /* Computed by the caller, not here. Reading the clock during a render is
     impure, and an email template rendered twice must produce the same bytes
     both times — otherwise the preview and the sent message disagree. */
  hoursSinceViewed: number | null;
  adminUrl: string;
}) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);

  const hours = hoursSinceViewed;

  return (
    <Shell
      preview={`${clientName} read the contract and hasn't signed`}
      footerNote="Automated alert from your admin."
    >
      <H1>Read, not signed</H1>

      <P>
        <strong>{clientName}</strong> opened their contract
        {hours ? ` about ${hours} hours ago` : ""} and has not signed it.
      </P>

      <Section
        style={{
          backgroundColor: brand.surface,
          borderRadius: "8px",
          padding: "18px 20px",
          margin: "0 0 20px",
        }}
      >
        <DetailRow label="Client" value={clientName} />
        <DetailRow label="Value" value={formatted} />
        <DetailRow
          label="Opened"
          value={viewedAt ? new Date(viewedAt).toISOString().slice(0, 16) : "—"}
        />
      </Section>

      <P>
        <Button href={adminUrl}>Open the contract</Button>
      </P>

      <Muted>
        Silence after reading usually means a specific clause, not general
        hesitation. Worth asking which one.
      </Muted>
    </Shell>
  );
}

export default ContractStale;
