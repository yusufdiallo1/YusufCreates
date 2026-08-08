import { Section, Text } from "@react-email/components";
import { Shell, H1, P, Muted, brand } from "./components/Shell";

/**
 * One of the two access codes.
 *
 * Deliberately contains NO LINK. A code email that also carries a link is a
 * one-click phishing template, and it defeats the point of the second factor —
 * whoever intercepts the email would have both halves. The recipient already
 * has the page open; they only need the number.
 *
 * The expiry is stated in words as well as shown, because "60 seconds" read
 * after the fact explains a code that no longer works better than silence.
 */
export function ContractShareCode({
  code,
  stage,
  secondsValid,
}: {
  code: string;
  stage: "one" | "two";
  secondsValid: number;
}) {
  const window =
    secondsValid >= 120
      ? `${Math.round(secondsValid / 60)} minutes`
      : `${secondsValid} seconds`;

  return (
    <Shell
      preview={`Your access code: ${code}`}
      footerNote="If you weren't expecting this, you can ignore it — the code is useless on its own."
    >
      <H1>{stage === "one" ? "Your access code" : "Second code"}</H1>

      <P>
        {stage === "one"
          ? "Enter this on the page you already have open."
          : "Almost there — this is the second and last code."}
      </P>

      <Section
        style={{
          backgroundColor: brand.surface,
          borderRadius: "8px",
          padding: "22px 20px",
          margin: "0 0 20px",
          textAlign: "center" as const,
        }}
      >
        <Text
          style={{
            fontSize: "30px",
            letterSpacing: "0.14em",
            fontFamily: "Menlo, Consolas, monospace",
            margin: 0,
            color: brand.text,
          }}
        >
          {code}
        </Text>
      </Section>

      <P>
        It expires in <strong>{window}</strong>. If it runs out, ask for
        another on the same page.
      </P>

      <Muted>
        Nobody will ever ask you to read this code out or forward this email.
      </Muted>
    </Shell>
  );
}

export default ContractShareCode;
