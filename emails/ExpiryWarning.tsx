import { Shell, H1, P, Muted, DetailRow } from "./components/Shell";

/**
 * SSL and domain expiry, at 30, 14 and 7 days.
 *
 * A lapsed domain is the single most expensive thing that can happen to a
 * client site, and it is entirely preventable. Someone else can register it,
 * the email attached to it stops, and getting it back ranges from an awkward
 * fee to impossible. An expired certificate is milder but louder: every
 * visitor gets a full-page browser warning telling them the site is unsafe.
 *
 * Both are on a countdown that nobody is watching, which is exactly the kind
 * of thing a machine should watch.
 *
 * The client gets this too, not just me, and deliberately. A domain renewal
 * usually needs the card on the registrar account — which is theirs, not
 * mine — so an alert only I can see is an alert that arrives at the wrong
 * person.
 */
export function ExpiryWarning({
  audience,
  name,
  kind,
  siteUrl,
  expiresAt,
  daysLeft,
  registrarHint,
}: {
  audience: "admin" | "client";
  name?: string;
  kind: "ssl" | "domain";
  siteUrl: string;
  expiresAt: number;
  daysLeft: number;
  /** What they told me on the intake form, when they told me. */
  registrarHint?: string;
}) {
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const on = new Date(expiresAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const thing = kind === "domain" ? "domain" : "SSL certificate";
  const urgent = daysLeft <= 7;

  if (audience === "admin") {
    return (
      <Shell preview={`${host} — ${thing} expires in ${daysLeft} days.`}>
        <H1>
          {host}: {thing} expires in {daysLeft} days.
        </H1>

        <DetailRow label="Site" value={siteUrl} />
        <DetailRow label="Expires" value={on} />
        <DetailRow label="Type" value={kind === "domain" ? "Domain registration" : "TLS certificate"} />
        {registrarHint ? (
          <DetailRow label="Registrar (from intake)" value={registrarHint} />
        ) : null}

        <P>
          The client has been sent the same warning. Warnings go out at 30, 14
          and 7 days and then stop — this does not nag daily.
        </P>
      </Shell>
    );
  }

  const first = name?.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  return (
    <Shell
      preview={`${host}: your ${thing} expires in ${daysLeft} days.`}
      footerNote="You're receiving this because your site is on a Care Plan."
    >
      <H1>
        {greeting}your {thing} expires in {daysLeft} days.
      </H1>

      <P>
        <strong>{host}</strong> has a {thing} that runs out on{" "}
        <strong>{on}</strong>.
      </P>

      {kind === "domain" ? (
        <P>
          {urgent ? (
            <>
              <strong>This one is worth doing today.</strong>{" "}
            </>
          ) : null}
          Domain renewals are almost always paid on a card held by the
          registrar account, which is yours rather than mine — so this is the
          one thing I cannot quietly handle for you.
          {registrarHint ? ` Your registrar is ${registrarHint}.` : ""} If the
          renewal is already on auto-renew, check the card on file has not
          expired, which is the usual way this catches people out.
        </P>
      ) : (
        <P>
          Most certificates renew themselves and this will sort itself out. I
          am telling you because when they do not, every visitor gets a
          full-page browser warning saying the site is unsafe — and by then it
          is a Saturday. I am watching it and will step in if it has not
          renewed by the last few days.
        </P>
      )}

      <Muted>
        Reply if you would like me to take this on, or if you are not sure who
        holds the account — sorting that out now is much easier than sorting
        it out after it lapses.
      </Muted>
    </Shell>
  );
}

export default ExpiryWarning;
