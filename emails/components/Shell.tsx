import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

/**
 * Shared shell for every email this app sends.
 *
 * Email is not the web. There is no cascade worth relying on, Outlook renders
 * through Word, and Gmail strips <style> blocks in some clients — so every
 * rule here is inline, and layout is tables via react-email's primitives.
 *
 * The palette is the site's, translated to hex: the CSS custom properties the
 * app uses do not exist in an email client, and var() silently collapses to
 * nothing rather than falling back.
 *
 * Deliberately light-background. Dark-mode email is unpredictable — several
 * clients forcibly invert colours and a near-black template can end up with
 * black text on black. A light shell survives that inversion legibly.
 */

/**
 * Absolute, because an email has no origin to resolve a relative path
 * against. Falls back to the live domain so a preview rendered without env
 * still shows the logo rather than a broken image.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://yusufcreates.com";

export const brand = {
  canvas: "#ffffff",
  surface: "#f6f6f8",
  text: "#1a1b1e",
  secondary: "#5b5f66",
  hairline: "#e4e4e8",
  accent: "#4c58c0",
} as const;

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif';

export function Shell({
  preview,
  children,
  footerNote,
  unsubscribeUrl,
}: {
  /** Inbox preview line. Without it clients show the first body text. */
  preview: string;
  children: React.ReactNode;
  footerNote?: string;
  /** Only for broadcasts. Transactional mail must not carry one. */
  unsubscribeUrl?: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "32px 12px",
          backgroundColor: brand.surface,
          fontFamily: font,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: brand.canvas,
            borderRadius: "12px",
            border: `1px solid ${brand.hairline}`,
            padding: "40px",
          }}
        >
          {/* Logo image with the wordmark beside it.

              Many clients block images by default, so the wordmark is real
              text rather than part of the picture — if the logo never loads,
              the header still reads correctly instead of showing a broken
              icon with nothing next to it. PNG, not SVG: Gmail and Outlook
              both refuse SVG in email. */}
          <Section style={{ marginBottom: "32px" }}>
            <Row>
              <Column style={{ width: "28px", verticalAlign: "middle" }}>
                <Img
                  /* Dark ink. Email bodies are white, and the light mark
                     built for the site's near-black canvas was almost
                     invisible against one — the wordmark carried the header
                     on its own. Same geometry, inverted. */
                  src={`${SITE_URL}/email-logo-dark.png`}
                  width="24"
                  height="24"
                  alt=""
                  style={{ display: "block" }}
                />
              </Column>
              <Column style={{ verticalAlign: "middle", paddingLeft: "10px" }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: brand.text,
                  }}
                >
                  Yusuf Creates
                </Text>
              </Column>
            </Row>
          </Section>

          {children}

          <Hr
            style={{
              borderColor: brand.hairline,
              borderTop: `1px solid ${brand.hairline}`,
              margin: "36px 0 20px",
            }}
          />

          <Section>
            {footerNote ? (
              <Text
                style={{
                  margin: "0 0 8px",
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: brand.secondary,
                }}
              >
                {footerNote}
              </Text>
            ) : null}

            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: "18px",
                color: brand.secondary,
              }}
            >
              Yusuf Creates ·{" "}
              <Link href="https://yusufcreates.com" style={{ color: brand.secondary }}>
                yusufcreates.com
              </Link>
              {" · "}
              <Link
                href="https://www.instagram.com/yusufcreatesdev/"
                style={{ color: brand.secondary }}
              >
                {/* Glyph then handle, both inside the link so either one is
                    clickable. PNG for the same reason as the header mark —
                    Gmail and Outlook refuse SVG — and rendered at 2x so it
                    stays sharp on a retina screen.

                    `alt` is empty rather than "Instagram": the handle sits
                    right beside it, and a screen reader announcing
                    "Instagram @yusufcreatesdev" reads the same thing twice.
                    A blocked image therefore leaves the handle alone rather
                    than a broken-icon placeholder. */}
                <Img
                  src={`${SITE_URL}/email-instagram.png`}
                  width="13"
                  height="13"
                  alt=""
                  style={{
                    display: "inline-block",
                    verticalAlign: "-2px",
                    marginRight: "5px",
                  }}
                />
                @yusufcreatesdev
              </Link>
              {unsubscribeUrl ? (
                <>
                  {" · "}
                  <Link href={unsubscribeUrl} style={{ color: brand.secondary }}>
                    Unsubscribe
                  </Link>
                </>
              ) : null}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Body copy. */
export function P({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        fontSize: "15px",
        lineHeight: "24px",
        color: brand.text,
      }}
    >
      {children}
    </Text>
  );
}

/** Quieter body copy, for asides and small print. */
export function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        fontSize: "13px",
        lineHeight: "20px",
        color: brand.secondary,
      }}
    >
      {children}
    </Text>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 20px",
        fontSize: "22px",
        lineHeight: "30px",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: brand.text,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * A bulletproof-ish button. Rendered as a padded anchor rather than a table
 * button, which is the pattern that survives Gmail, Apple Mail and Outlook
 * without conditional comments.
 */
export function Button({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-block",
        padding: "11px 22px",
        backgroundColor: brand.accent,
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: 500,
        borderRadius: "9999px",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

/** Label/value rows for the notification email. */
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Text
      style={{
        margin: "0 0 6px",
        fontSize: "13px",
        lineHeight: "20px",
        color: brand.text,
      }}
    >
      <span style={{ color: brand.secondary }}>{label}: </span>
      {value}
    </Text>
  );
}
