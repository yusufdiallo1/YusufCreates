import { Shell, H1, P, Muted } from "./components/Shell";

/**
 * Receipt. Sent by the webhook when Stripe confirms a payment.
 *
 * Deliberately short. The money has already moved and there is nothing to do,
 * so the only jobs here are to confirm it landed and say what happens next.
 */
export function PaymentReceived({
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
  const first = name.trim().split(/\s+/)[0] || "there";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);

  return (
    <Shell
      preview={`Payment received — ${formatted} (${reference})`}
      footerNote="This is a receipt for a payment you made to Yusuf Creates."
    >
      <H1>Payment received</H1>

      <P>
        Thanks {first} — {formatted} landed against {reference}. Nothing further
        is needed from you.
      </P>

      <Muted>
        A full invoice and receipt are attached to the payment page linked from
        the original invoice email. Reply here if you need anything reissued for
        your records.
      </Muted>
    </Shell>
  );
}

export default PaymentReceived;
