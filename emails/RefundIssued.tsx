import { Shell, H1, P, Muted } from "./components/Shell";

/**
 * Sent when a payment is refunded.
 *
 * People notice money leaving their account and they notice it arriving back,
 * but a refund with no email reads as a mistake — or worse, as fraud. This
 * says plainly what happened and when to expect it, because "5 to 10 working
 * days" is the bank's timeline and nobody knows that unless told.
 */
export function RefundIssued({
  name,
  reference,
  amount,
  currency,
}: {
  name: string;
  reference: string;
  amount: number;
  currency: string;
}) {
  const raw = name.trim();
  const first = raw && raw.toLowerCase() !== "there" ? raw.split(/\s+/)[0] : "";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);

  return (
    <Shell
      preview={`${formatted} has been refunded (${reference})`}
      footerNote="This is a refund confirmation for a payment made to Yusuf Creates."
    >
      <H1>Refund issued</H1>

      <P>
        {first ? `${first}, ` : ""}
        {formatted} has been refunded against {reference}. Nothing is owed on
        this invoice.
      </P>

      <Muted>
        Refunds go back to the card that paid, and banks typically take five to
        ten working days to show it. If it has not appeared after that, reply
        here and I will chase it with Stripe.
      </Muted>
    </Shell>
  );
}

export default RefundIssued;
