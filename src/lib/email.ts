import "server-only";
import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

/**
 * Email sending.
 *
 * `server-only` is the important import: RESEND_API_KEY must never be reachable
 * from a client component, and this makes an accidental client import a build
 * error rather than a leaked key.
 *
 * Two rules hold everywhere below:
 *
 * 1. Sending never throws into a request path. If Resend is down, the lead is
 *    already saved in Convex — losing the enquiry because the email failed
 *    would be far worse than a missing confirmation. Failures are returned,
 *    logged, and swallowed by the caller.
 *
 * 2. Nothing is sent when RESEND_API_KEY is unset, which is the state on a
 *    fresh clone. It reports "skipped" rather than pretending to succeed.
 */

export type SendResult =
  | { status: "sent"; id?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

/**
 * The From address. Resend requires the domain to be verified; an unverified
 * domain fails at send time rather than at configuration time, so the default
 * here is only useful in development.
 */
function from(): string {
  return process.env.EMAIL_FROM ?? "Yusuf Creates <onboarding@resend.dev>";
}

export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
}: {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
}): Promise<SendResult> {
  const resend = getClient();
  if (!resend) {
    return { status: "skipped", reason: "RESEND_API_KEY not set" };
  }

  try {
    /*
     * Rendered here rather than handed to Resend as a React element.
     * Resend's `react` option resolves @react-email/render through a dynamic
     * require, which Next's server bundler cannot satisfy — it fails at run
     * time with "Failed to render React component" even though the package is
     * installed. Rendering first sidesteps that entirely.
     *
     * The plaintext part is not optional: a multipart message lands better
     * with spam filters, and some clients still prefer text.
     */
    const html = await render(react);
    const text = await render(react, { plainText: true });

    const { data, error } = await resend.emails.send({
      from: from(),
      to,
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      return { status: "failed", error: error.message ?? "Unknown Resend error" };
    }
    return { status: "sent", id: data?.id };
  } catch (err) {
    // Network failure, DNS, timeout. Never rethrown — see rule 1.
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/** Absolute base URL for links inside emails. Relative URLs cannot work here. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    "http://localhost:3000"
  );
}

/** Where enquiry notifications go. */
export function adminEmail(): string | null {
  return process.env.ADMIN_EMAIL ?? null;
}
