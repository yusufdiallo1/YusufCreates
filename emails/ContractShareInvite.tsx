import { Shell, H1, P, Muted, Button } from "./components/Shell";

/**
 * The invitation to view a shared contract.
 *
 * Says up front that codes are coming, because a link that then demands two
 * emailed numbers looks like a scam if you were not warned. Setting the
 * expectation is what makes the security measure feel like security rather
 * than an obstacle.
 */
export function ContractShareInvite({
  clientName,
  shareUrl,
  scope,
}: {
  clientName: string;
  shareUrl: string;
  scope: "contract" | "pdf" | "audit";
}) {
  const what =
    scope === "pdf"
      ? "the signed PDF"
      : scope === "audit"
        ? "the signature record"
        : "the signed contract";

  return (
    <Shell
      preview={`${clientName} — ${what}`}
      footerNote="Sent by Yusuf Creates. If this wasn't expected, just ignore it."
    >
      <H1>You&apos;ve been sent {what}</H1>

      <P>
        This relates to <strong>{clientName}</strong>. Opening it takes two
        short codes, which will be emailed to this address one after the other
        once you press the button on the page.
      </P>

      <P>
        <Button href={shareUrl}>Open the document</Button>
      </P>

      <Muted>
        The link on its own does not give access, so it is safe if it sits in
        your inbox. It stops working after 14 days.
      </Muted>
    </Shell>
  );
}

export default ContractShareInvite;
