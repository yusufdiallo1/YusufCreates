import { Shell, H1, P, Muted, Button } from "./components/Shell";

/**
 * Confirmed opt-in. Nothing is sent to this address again until the link is
 * clicked.
 *
 * This is the slower path, and it is the right one: a list built without
 * confirmation fills with typos and addresses signed up by other people, which
 * is how a sending domain gets its reputation ruined. It is also the defensible
 * position under GDPR and PDPL.
 *
 * No unsubscribe link — there is nothing to unsubscribe from yet. The
 * do-nothing instruction below is the opt-out.
 */
export function NewsletterWelcome({ confirmUrl }: { confirmUrl: string }) {
  return (
    <Shell
      preview="One click to confirm, and you're on the list."
      footerNote="You received this because this address was entered on yusufcreates.com. If that wasn't you, ignore this email and nothing further will be sent."
    >
      <H1>Confirm your subscription</H1>

      <P>
        One click and you&apos;re on the list — occasional notes on what
        I&apos;m building, what broke, and what I&apos;d do differently. No
        schedule, no filler.
      </P>

      <P>
        <Button href={confirmUrl}>Confirm subscription</Button>
      </P>

      <Muted>
        If that wasn&apos;t you, do nothing. Without this confirmation the
        address is never written to the list and you won&apos;t hear from me
        again.
      </Muted>
    </Shell>
  );
}

export default NewsletterWelcome;
