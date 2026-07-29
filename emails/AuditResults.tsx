import { Shell, H1, P, Muted, Button, DetailRow } from "./components/Shell";

/**
 * Site audit results.
 *
 * The form asks "where to send the results", so this is the thing that makes
 * that true. It was collecting an address and sending nothing, which is worse
 * than not asking — someone waits for an email that was never coming.
 *
 * The scores are included in the body rather than only linked. An email that
 * says "your results are ready, click here" is indistinguishable from
 * marketing; one that leads with the actual number is the report itself.
 */

/** Google's own thresholds, so the wording matches what the numbers mean. */
function verdict(score: number): string {
  if (score >= 90) return "Good";
  if (score >= 50) return "Needs work";
  return "Poor";
}

export function AuditResults({
  url,
  score,
  categories,
  fixes = [],
  reportUrl,
}: {
  url: string;
  score?: number;
  categories?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  fixes?: { title: string; detail: string; impact: string }[];
  reportUrl: string;
}) {
  // Hostname only — the full URL with its query string reads as machine output.
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Keep the raw string; it is only a display label.
  }

  const headline = typeof score === "number" ? Math.round(score) : null;

  return (
    <Shell
      preview={
        headline !== null
          ? `${host} scored ${headline}/100 — ${verdict(headline)}`
          : `Your audit of ${host} is ready`
      }
      footerNote="You received this because you requested a free site audit at yusufcreates.com."
    >
      <H1>{host}</H1>

      {headline !== null ? (
        <P>
          Your site scored <strong>{headline} out of 100</strong> on mobile —{" "}
          {verdict(headline).toLowerCase()}. Measured with Google PageSpeed
          Insights, the same tool that feeds Core Web Vitals and search
          ranking.
        </P>
      ) : (
        <P>The audit finished. Full results are on the report page.</P>
      )}

      {categories ? (
        <>
          {typeof categories.performance === "number" ? (
            <DetailRow
              label="Performance"
              value={`${Math.round(categories.performance)} / 100`}
            />
          ) : null}
          {typeof categories.accessibility === "number" ? (
            <DetailRow
              label="Accessibility"
              value={`${Math.round(categories.accessibility)} / 100`}
            />
          ) : null}
          {typeof categories.bestPractices === "number" ? (
            <DetailRow
              label="Best practices"
              value={`${Math.round(categories.bestPractices)} / 100`}
            />
          ) : null}
          {typeof categories.seo === "number" ? (
            <DetailRow
              label="SEO"
              value={`${Math.round(categories.seo)} / 100`}
            />
          ) : null}
        </>
      ) : null}

      {fixes.length > 0 ? (
        <>
          <P>
            <strong>The three that matter most</strong>
          </P>
          {fixes.slice(0, 3).map((fix) => (
            <P key={fix.title}>
              <strong>{fix.title}</strong>
              <br />
              {fix.detail}
            </P>
          ))}
        </>
      ) : null}

      <Button href={reportUrl}>See the full report</Button>

      <Muted>
        These are real measurements, not an estimate — you can run the same
        test yourself on PageSpeed Insights and get the same numbers. If
        you&apos;d like a hand fixing any of it, just reply to this email.
      </Muted>
    </Shell>
  );
}
