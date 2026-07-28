import { Shell, H1, P, Muted, Button } from "./components/Shell";

/**
 * Sent when a charge is declined.
 *
 * The tone matters here. A declined card is almost never the client's fault —
 * on invoices of a few thousand and up it is usually the issuer's fraud rules,
 * and it clears with one phone call. Saying that plainly turns an embarrassing
 * email into a useful one.
 */
export function PaymentFailed({
  name,
  reference,
  reason,
  payUrl,
}: {
  name: string;
  reference: string;
  reason: string;
  payUrl?: string;
}) {
  const first = name.trim().split(/\s+/)[0] || "there";

  return (
    <Shell
      preview={`The payment for ${reference} didn't go through`}
      footerNote="You're receiving this because a payment was attempted against an invoice from Yusuf Creates."
    >
      <H1>That payment didn&apos;t go through</H1>

      <P>
        Hi {first} — the payment against {reference} was declined. {reason}
      </P>

      <P>
        Nothing is lost. The invoice is still open and the link below works as
        soon as you&apos;re ready to try again.
      </P>

      {payUrl ? (
        <P>
          <Button href={payUrl}>Try the payment again</Button>
        </P>
      ) : null}

      <Muted>
        If it declines a second time, reply to this email and I&apos;ll sort out
        another way to pay. This happens more often than you&apos;d think on
        larger amounts.
      </Muted>
    </Shell>
  );
}

export default PaymentFailed;
