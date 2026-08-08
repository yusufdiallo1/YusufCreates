import { Shell, H1, P, DetailRow, Muted } from "./components/Shell";

/**
 * A week-over-week performance drop of more than ten points.
 *
 * Almost always someone uploading a 4MB photo straight off a camera. Catching
 * that in the same week it happened is precisely what the retainer is for —
 * a month later the page is slow, nobody remembers what changed, and finding
 * it means bisecting a month of edits.
 *
 * Me only. A client does not need a score alert; they need it fixed, and then
 * a line in the monthly report saying it was.
 */
export function LighthouseDrop({
  siteUrl,
  previous,
  current,
  lcp,
  cls,
}: {
  siteUrl: string;
  previous: number;
  current: number;
  /** Largest Contentful Paint in ms, when the run reported one. */
  lcp?: number;
  cls?: number;
}) {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const drop = previous - current;

  return (
    <Shell preview={`${host} performance fell ${drop} points this week.`}>
      <H1>
        {host}: performance down {drop} points.
      </H1>

      <DetailRow label="Site" value={siteUrl} />
      <DetailRow label="Last week" value={String(previous)} />
      <DetailRow label="This week" value={String(current)} />
      {lcp !== undefined ? (
        <DetailRow label="LCP" value={`${(lcp / 1000).toFixed(1)}s`} />
      ) : null}
      {cls !== undefined ? (
        <DetailRow label="CLS" value={cls.toFixed(3)} />
      ) : null}

      <P>
        {lcp !== undefined && lcp > 2500
          ? "LCP is over 2.5s, which usually means a large image landed on the page. Check what was uploaded this week before looking anywhere else."
          : "Worth a look at what changed on the site this week."}
      </P>

      <Muted>
        Measured by PageSpeed on the mobile profile, which is the stricter of
        the two and the one that matches how the site is actually read.
      </Muted>
    </Shell>
  );
}

export default LighthouseDrop;
