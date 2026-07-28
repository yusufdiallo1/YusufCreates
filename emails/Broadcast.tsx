import { Shell, H1, P, Button } from "./components/Shell";

/**
 * Newsletter broadcast.
 *
 * Built from the same primitives as every other email, so the preview in the
 * composer and the message that actually sends render through identical code.
 * A preview that only approximates the output is worse than none — it tells
 * you the layout is fine when it is not.
 */
export function Broadcast({
  subject,
  body,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
}: {
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
}) {
  // Blank lines separate paragraphs, which is how people naturally type.
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <Shell
      preview={subject}
      unsubscribeUrl={unsubscribeUrl}
      footerNote="You're receiving this because you subscribed at yusufcreates.com."
    >
      <H1>{subject}</H1>

      {paragraphs.map((paragraph, i) => (
        <P key={i}>{paragraph.trim()}</P>
      ))}

      {ctaLabel && ctaUrl ? (
        <P>
          <Button href={ctaUrl}>{ctaLabel}</Button>
        </P>
      ) : null}
    </Shell>
  );
}

export default Broadcast;
