import { Section, Row, Column, Text, Hr } from "@react-email/components";
import { Shell, H1, P, Muted, brand } from "./components/Shell";

/**
 * The monthly Care Plan report.
 *
 * This email is the entire justification for the retainer. A client paying
 * £450 a month and receiving nothing spends the year quietly wondering what
 * it is for, and then cancels — not because the work stopped, but because
 * they never saw it. Invisible maintenance is indistinguishable from none.
 *
 * So it opens with three numbers they can read in two seconds, and only then
 * explains. The numbers are honest ones: a month with an outage says so, with
 * the duration and what was done about it. A report that always says
 * "everything is fine" is a report nobody reads by March, and the one month
 * it matters they will not read it either.
 *
 * Written to be forwardable. Clients forward this to whoever signs off the
 * invoice, and that person has no context at all.
 */

function Stat({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string;
  tone?: "normal" | "good" | "warn";
}) {
  const colour =
    tone === "good" ? "#1a7f37" : tone === "warn" ? "#b3541e" : brand.text;

  return (
    <Column
      style={{
        width: "33.33%",
        padding: "16px 12px",
        backgroundColor: brand.surface,
        borderRadius: "10px",
        verticalAlign: "top",
      }}
    >
      <Text
        style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: "28px",
          color: colour,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          margin: "2px 0 0",
          fontSize: "11px",
          lineHeight: "16px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: brand.secondary,
        }}
      >
        {label}
      </Text>
    </Column>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <Text
      style={{
        margin: "0 0 12px",
        fontSize: "13px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: brand.secondary,
      }}
    >
      {children}
    </Text>
  );
}

export function MonthlyReport({
  name,
  month,
  siteUrl,
  uptimePercent,
  incidents,
  performance,
  performancePrevious,
  accessibility,
  seo,
  sslExpiresAt,
  domainExpiresAt,
  fixed,
  upcoming,
  dashboardUrl,
}: {
  name: string;
  /** "January 2026". Formatted by the caller, which knows the timezone. */
  month: string;
  siteUrl: string;
  uptimePercent: number;
  incidents: {
    openedAt: number;
    durationMinutes: number;
    resolutionNote?: string;
  }[];
  performance?: number;
  performancePrevious?: number;
  accessibility?: number;
  seo?: number;
  sslExpiresAt?: number;
  domainExpiresAt?: number;
  /** Things I did this month. Empty is normal and says so honestly. */
  fixed: string[];
  upcoming: string[];
  dashboardUrl: string;
}) {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  const perfDelta =
    performance !== undefined && performancePrevious !== undefined
      ? performance - performancePrevious
      : undefined;

  const day = (ts?: number) =>
    ts
      ? new Date(ts).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  const perfect = incidents.length === 0 && uptimePercent >= 99.99;

  return (
    <Shell
      preview={`${host} — ${uptimePercent.toFixed(2)}% uptime in ${month}.`}
      footerNote="You're receiving this because your site is on a Care Plan. It goes out on the first of each month."
    >
      <H1>
        {greeting}{month} on {host}.
      </H1>

      {/* Three numbers, readable in two seconds. Everything below explains
          them; someone who reads only this row has still been told the
          important part. */}
      <Section style={{ margin: "0 0 28px" }}>
        <Row>
          <Stat
            label="Uptime"
            value={`${uptimePercent.toFixed(2)}%`}
            tone={uptimePercent >= 99.9 ? "good" : "warn"}
          />
          <Column style={{ width: "12px" }} />
          <Stat
            label="Incidents"
            value={String(incidents.length)}
            tone={incidents.length === 0 ? "good" : "warn"}
          />
          <Column style={{ width: "12px" }} />
          <Stat
            label="Performance"
            value={performance !== undefined ? String(performance) : "—"}
            tone={
              performance === undefined
                ? "normal"
                : performance >= 90
                  ? "good"
                  : performance >= 50
                    ? "normal"
                    : "warn"
            }
          />
        </Row>
      </Section>

      <P>
        {perfect
          ? "Your site was up every time it was checked this month — that is 288 checks a day, every day. Nothing needed intervention."
          : `Your site was checked every five minutes throughout ${month}. Here is what happened.`}
      </P>

      {/* ------------------------------------------------------ incidents --- */}
      {incidents.length > 0 ? (
        <>
          <Hr style={{ borderColor: brand.hairline, margin: "28px 0 20px" }} />
          <Heading>Incidents</Heading>

          {incidents.map((incident) => (
            <Text
              key={incident.openedAt}
              style={{
                margin: "0 0 14px",
                fontSize: "14px",
                lineHeight: "22px",
                color: brand.text,
              }}
            >
              <strong>
                {new Date(incident.openedAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" · "}
                {incident.durationMinutes} min
              </strong>
              <br />
              <span style={{ color: brand.secondary }}>
                {incident.resolutionNote ??
                  "Recovered on its own before intervention was needed. Logged and watched."}
              </span>
            </Text>
          ))}
        </>
      ) : null}

      {/* ----------------------------------------------------- lighthouse --- */}
      {performance !== undefined ? (
        <>
          <Hr style={{ borderColor: brand.hairline, margin: "28px 0 20px" }} />
          <Heading>Speed and quality</Heading>

          <P>
            {perfDelta === undefined || Math.abs(perfDelta) < 3 ? (
              <>Performance held steady at {performance} out of 100.</>
            ) : perfDelta > 0 ? (
              <>
                Performance is <strong>up {perfDelta} points</strong> to{" "}
                {performance} out of 100.
              </>
            ) : (
              <>
                Performance is{" "}
                <strong>down {Math.abs(perfDelta)} points</strong> to{" "}
                {performance} out of 100. I am looking at why.
              </>
            )}{" "}
            {accessibility !== undefined
              ? `Accessibility ${accessibility}, `
              : ""}
            {seo !== undefined ? `SEO ${seo}.` : ""}
          </P>

          <Muted>
            Measured weekly by Google PageSpeed on the mobile profile — the
            stricter of the two, and the one that matches how most people
            actually reach the site.
          </Muted>
        </>
      ) : null}

      {/* ---------------------------------------------------------- work --- */}
      {fixed.length > 0 ? (
        <>
          <Hr style={{ borderColor: brand.hairline, margin: "28px 0 20px" }} />
          <Heading>What I did</Heading>
          <ul style={{ margin: "0 0 16px", paddingLeft: "20px" }}>
            {fixed.map((item) => (
              <li
                key={item}
                style={{
                  margin: "0 0 6px",
                  fontSize: "15px",
                  lineHeight: "24px",
                  color: brand.text,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* ------------------------------------------------------- renewals --- */}
      {sslExpiresAt || domainExpiresAt ? (
        <>
          <Hr style={{ borderColor: brand.hairline, margin: "28px 0 20px" }} />
          <Heading>Renewals on the horizon</Heading>
          <P>
            {domainExpiresAt
              ? `Your domain renews on ${day(domainExpiresAt)}. `
              : ""}
            {sslExpiresAt
              ? `The SSL certificate renews on ${day(sslExpiresAt)}.`
              : ""}{" "}
            I will warn you at 30, 14 and 7 days before either one, so nothing
            lapses quietly.
          </P>
        </>
      ) : null}

      {/* ------------------------------------------------------- upcoming --- */}
      {upcoming.length > 0 ? (
        <>
          <Hr style={{ borderColor: brand.hairline, margin: "28px 0 20px" }} />
          <Heading>Coming up</Heading>
          <ul style={{ margin: "0 0 16px", paddingLeft: "20px" }}>
            {upcoming.map((item) => (
              <li
                key={item}
                style={{
                  margin: "0 0 6px",
                  fontSize: "15px",
                  lineHeight: "24px",
                  color: brand.text,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Hr style={{ borderColor: brand.hairline, margin: "28px 0 20px" }} />

      <P>
        Every check behind these numbers is on your dashboard:{" "}
        <a href={dashboardUrl} style={{ color: brand.accent }}>
          {dashboardUrl}
        </a>
      </P>

      <Muted>
        Anything on here you want explained, or anything you would like me to
        look at next month — just reply.
      </Muted>
    </Shell>
  );
}

export default MonthlyReport;
