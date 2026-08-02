import { Section } from "@react-email/components";
import { Shell, H1, P, Muted, Button, brand } from "./components/Shell";

/**
 * Tells me something needs me. Sent to my own address, not a client's.
 *
 * Written for a phone lock screen: the subject line and first sentence carry
 * the whole message, because the decision this prompts is usually "open the
 * admin now or in an hour", and that is answerable without reading further.
 *
 * Express builds are two hours long, which is shorter than the gap between
 * my checking the admin unprompted. Without this, a client paying at 9am and
 * a client asking a question mid-build both wait on me noticing.
 */
export function AdminAlert({
  kind,
  name,
  email,
  plan,
  preview,
  adminUrl,
}: {
  kind: "new" | "paid" | "message";
  name: string;
  email: string;
  plan: string;
  /** The brief, or the message they sent — trimmed by the caller. */
  preview: string;
  adminUrl: string;
}) {
  const heading =
    kind === "new"
      ? `${name} sent a request`
      : kind === "paid"
        ? `${name} paid — waiting on you to start`
        : `${name} sent a message`;

  const body =
    kind === "new"
      ? "Nothing is running yet. Read it and either approve or decline — they are told either way."
      : kind === "paid"
        ? "The money has cleared and the clock has NOT started. It starts when you check this over and press start, so nothing is burning while you read."
        : "They wrote during a live build, so the clock is running while this sits unread.";

  return (
    <Shell preview={`${heading} — ${plan}`}>
      <H1>{heading}</H1>
      <P>{body}</P>

      <Section
        style={{
          backgroundColor: brand.surface,
          borderRadius: "8px",
          padding: "16px 20px",
          margin: "0 0 20px",
        }}
      >
        <P>{preview}</P>
      </Section>

      <Section style={{ margin: "0 0 20px" }}>
        <Button href={adminUrl}>Open the admin</Button>
      </Section>

      <Muted>
        {plan} · {email}
      </Muted>
    </Shell>
  );
}

export default AdminAlert;
