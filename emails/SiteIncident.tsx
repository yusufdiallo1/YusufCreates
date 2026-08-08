import { Shell, H1, P, Muted, DetailRow } from "./components/Shell";

/**
 * An outage, told two very different ways.
 *
 * To me: the facts, immediately, with nothing softened. I need the URL, the
 * status code and the time, and I need them on a lock screen.
 *
 * To the client: only after fifteen minutes, and never without saying what I
 * am already doing about it. An alert that says "your site is down" and stops
 * there hands them a problem. The whole value of a Care Plan is that they
 * find out from me, already handled, rather than from a customer.
 *
 * That fifteen-minute delay is not hedging. Most blips resolve inside two
 * checks, and waking a client for something that fixed itself before they
 * read the email teaches them to distrust the alerts that matter.
 */
export function SiteIncident({
  audience,
  name,
  siteUrl,
  openedAt,
  cause,
  closed,
  durationMinutes,
  resolutionNote,
}: {
  audience: "admin" | "client";
  name?: string;
  siteUrl: string;
  openedAt: number;
  /** The status code or error that opened it. */
  cause: string;
  closed?: boolean;
  durationMinutes?: number;
  resolutionNote?: string;
}) {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const when = new Date(openedAt).toUTCString();

  if (audience === "admin") {
    return (
      <Shell
        preview={
          closed
            ? `${host} is back up after ${durationMinutes ?? "?"} min.`
            : `${host} is down — ${cause}.`
        }
      >
        <H1>{closed ? `${host} is back.` : `${host} is down.`}</H1>

        <DetailRow label="Site" value={siteUrl} />
        <DetailRow label="Started" value={when} />
        <DetailRow label="Cause" value={cause} />
        {closed && durationMinutes !== undefined ? (
          <DetailRow label="Duration" value={`${durationMinutes} minutes`} />
        ) : null}

        <P>
          {closed
            ? "Two consecutive checks have succeeded, so the incident is closed."
            : "Two consecutive checks have failed. The client is told automatically if this passes fifteen minutes."}
        </P>
      </Shell>
    );
  }

  const first = name?.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  if (closed) {
    return (
      <Shell
        preview={`${host} is back online.`}
        footerNote="You're receiving this because your site is on a Care Plan."
      >
        <H1>{greeting}your site is back.</H1>

        <P>
          <strong>{host}</strong> is responding normally again
          {durationMinutes !== undefined
            ? `. It was unreachable for about ${durationMinutes} ${durationMinutes === 1 ? "minute" : "minutes"}.`
            : "."}
        </P>

        {resolutionNote ? <P>{resolutionNote}</P> : null}

        <Muted>
          This is logged on your dashboard alongside every other check, so
          there is a record of what happened and when.
        </Muted>
      </Shell>
    );
  }

  return (
    <Shell
      preview={`${host} is unreachable — I'm on it.`}
      footerNote="You're receiving this because your site is on a Care Plan."
    >
      <H1>{greeting}your site is down, and I am on it.</H1>

      <P>
        <strong>{host}</strong> has been unreachable for about fifteen minutes.
        I was alerted automatically the moment it started, so I have been
        looking at it since before this email.
      </P>

      <P>
        <strong>What I am doing:</strong> checking whether this is the host,
        the domain or the site itself, and I will have an answer shortly. It is
        being re-checked every five minutes and you will get another email the
        moment it comes back.
      </P>

      <Muted>
        You do not need to do anything. If you were mid-way through changing
        something on the site, reply and tell me — it narrows this down a lot.
      </Muted>
    </Shell>
  );
}

export default SiteIncident;
