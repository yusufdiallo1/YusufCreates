import type { Metadata } from "next";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";

export const metadata: Metadata = { title: "Settings" };

/**
 * Integration status is computed on the SERVER and only booleans cross the
 * wire. Reading process.env in a client component would either fail or, worse,
 * inline the value into the bundle.
 */
export default function AdminSettingsPage() {
  const integrations = [
    {
      name: "Convex",
      env: "NEXT_PUBLIC_CONVEX_URL",
      what: "Database and realtime queries.",
      configured: Boolean(process.env.NEXT_PUBLIC_CONVEX_URL),
    },
    {
      name: "Resend",
      env: "RESEND_API_KEY",
      what: "Sends every transactional email and the newsletter.",
      configured: Boolean(process.env.RESEND_API_KEY),
    },
    {
      name: "Sending address",
      env: "EMAIL_FROM",
      what: "The From header. Its domain must be verified in Resend.",
      configured: Boolean(process.env.EMAIL_FROM),
    },
    {
      name: "Resend webhook",
      env: "RESEND_WEBHOOK_SECRET",
      what: "Verifies inbound mail. Without it nothing sent to hello@ reaches the Inbox.",
      configured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    },
    {
      name: "Admin email",
      env: "ADMIN_EMAIL",
      what: "Where enquiry notifications go, and the only account allowed to sign in here.",
      configured: Boolean(process.env.ADMIN_EMAIL),
    },
    {
      name: "Server secret",
      env: "EMAIL_LOG_SECRET",
      what: "Gates server-to-server mutations: email logging, Stripe webhooks, chat rate limits.",
      configured: Boolean(process.env.EMAIL_LOG_SECRET),
    },
    {
      name: "Stripe",
      env: "STRIPE_SECRET_KEY",
      what: "Creates invoices and takes payment.",
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    {
      name: "Stripe webhook",
      env: "STRIPE_WEBHOOK_SECRET",
      what: "Verifies webhook signatures. Without it nothing is ever marked paid.",
      configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    },
    {
      name: "Anthropic",
      env: "ANTHROPIC_API_KEY",
      what: "Powers the site assistant.",
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
    },
    {
      name: "Turnstile",
      env: "TURNSTILE_SECRET_KEY",
      what: "Bot check on forms. Skipped when unset rather than blocking.",
      configured: Boolean(process.env.TURNSTILE_SECRET_KEY),
    },
  ];

  return <SettingsAdmin integrations={integrations} />;
}
