import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, Button, DetailRow, brand } from "./components/Shell";

/**
 * Sent to me when an enquiry lands.
 *
 * Written to be triaged from a phone lock screen: the preview line carries the
 * score, the plan and the name, so the decision to open it now or later can be
 * made without opening it. Everything they submitted is included, because
 * having to open the admin panel to see the message defeats the point.
 */
export function LeadNotification({
  name,
  email,
  phone,
  contactPreference,
  planLabel,
  score,
  band,
  fields = [],
  message,
  adminUrl,
}: {
  name: string;
  email: string;
  phone?: string;
  contactPreference?: string;
  planLabel?: string;
  score?: number;
  band?: string;
  fields?: { label: string; value: string }[];
  message?: string;
  adminUrl?: string;
}) {
  const heat = band ? band.toUpperCase() : "";

  return (
    <Shell
      preview={`${heat}${score !== undefined ? ` ${score}` : ""} · ${planLabel ?? "Enquiry"} · ${name}`}
    >
      <H1>
        {planLabel ?? "New enquiry"} — {name}
      </H1>

      {score !== undefined ? (
        <P>
          Score <strong>{score}</strong>
          {band ? ` (${band})` : ""}
        </P>
      ) : null}

      <Section
        style={{
          backgroundColor: brand.surface,
          borderRadius: "8px",
          padding: "18px 20px",
          margin: "0 0 20px",
        }}
      >
        <DetailRow label="Email" value={email} />
        {phone ? <DetailRow label="Phone" value={phone} /> : null}
        {contactPreference ? (
          <DetailRow label="Prefers" value={contactPreference} />
        ) : null}
        {fields.map((f) => (
          <DetailRow key={f.label} label={f.label} value={f.value} />
        ))}
      </Section>

      {message ? (
        <>
          <Muted>What they wrote</Muted>
          <Section
            style={{
              borderLeft: `2px solid ${brand.hairline}`,
              padding: "2px 0 2px 16px",
              margin: "0 0 24px",
            }}
          >
            <P>{message}</P>
          </Section>
        </>
      ) : null}

      {adminUrl ? <Button href={adminUrl}>Open in admin</Button> : null}
    </Shell>
  );
}

export default LeadNotification;
