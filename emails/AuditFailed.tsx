import { Shell, H1, P, Muted, DetailRow } from "./components/Shell";

/**
 * Internal notice: an audit someone requested did not complete.
 *
 * Goes to me, not the visitor. Somebody handed over their email expecting a
 * report, and a silent failure turns a warm lead into a person who thinks the
 * site is broken. Running it by hand and replying with real numbers is a
 * better first contact than the automated report would have been.
 */
export function AuditFailed({
  url,
  email,
  reason,
}: {
  url: string;
  email: string;
  reason: string;
}) {
  return (
    <Shell
      preview={`Audit failed for ${url} — ${email} is waiting`}
      footerNote="Internal notification from yusufcreates.com."
    >
      <H1>An audit did not complete</H1>

      <P>
        Someone asked for a report and did not get one. Run it manually and
        reply to them — they are expecting an email.
      </P>

      <DetailRow label="Site" value={url} />
      <DetailRow label="Their email" value={email} />
      <DetailRow label="Why it failed" value={reason} />

      <Muted>
        A rate limit here usually means PAGESPEED_API_KEY is unset, so the
        request fell back to the shared keyless quota.
      </Muted>
    </Shell>
  );
}
