import { Shell, H1, P, Muted, Button } from "./components/Shell";

/**
 * The day-3 and day-7 intake reminder.
 *
 * The entire design of this email is the list. "Please complete your
 * onboarding form" gets ignored, because it asks the reader to go and find
 * out what they owe. "I still need your logo and your domain login" gets
 * actioned, because it is already the to-do list.
 *
 * So the outstanding sections are named, and ONLY the outstanding ones —
 * anything already done or explicitly skipped is absent. Nudging someone
 * about a question they deliberately declined reads as not listening, and is
 * how a client starts ignoring the whole thread.
 *
 * No guilt, no deadline theatre. The honest reason is the strongest one: the
 * work stalls without these, and they would rather it did not.
 */
export function IntakeNudge({
  name,
  projectName,
  outstanding,
  intakeUrl,
  day,
}: {
  name: string;
  projectName: string;
  /** Human labels, resolved at enqueue time. Never empty — see below. */
  outstanding: string[];
  intakeUrl: string;
  /** 3 or 7. Changes the framing, not the ask. */
  day: number;
}) {
  const first = name.trim().split(/\s+/)[0];
  const greeting = first ? `${first} — ` : "";

  /*
   * Grammatical, not templated. "your logo and your domain access" reads
   * like a person wrote it; "Outstanding items: 2" reads like a system did,
   * and a system is easy to ignore.
   */
  const list =
    outstanding.length === 1
      ? outstanding[0]
      : `${outstanding.slice(0, -1).join(", ")} and ${outstanding[outstanding.length - 1]}`;

  return (
    <Shell
      preview={`Still need ${list} for ${projectName}.`}
      footerNote="You're receiving this because you have a live project with me."
    >
      <H1>{greeting}still need a few things.</H1>

      <P>
        {day >= 7
          ? `It has been a week since I sent the onboarding form for ${projectName}, and I am now waiting on it to keep moving.`
          : `Quick one on ${projectName} — there are a few things still outstanding on your onboarding form.`}
      </P>

      <P>
        <strong>What I still need:</strong>
      </P>

      <ul style={{ margin: "0 0 16px", paddingLeft: "20px" }}>
        {outstanding.map((item) => (
          <li
            key={item}
            style={{
              margin: "0 0 6px",
              fontSize: "15px",
              lineHeight: "24px",
              color: "#1a1b1e",
            }}
          >
            {item}
          </li>
        ))}
      </ul>

      <P>
        Each section saves on its own, so you can do one now and the rest
        later — nothing is lost if you stop halfway.
      </P>

      <div style={{ margin: "28px 0" }}>
        <Button href={intakeUrl}>Pick up where you left off</Button>
      </div>

      <Muted>
        If any of these are a problem — you cannot find the logo files, or
        someone else holds the domain — reply and tell me. Every question on
        the form is skippable, and there is almost always a way round.
      </Muted>
    </Shell>
  );
}

export default IntakeNudge;
