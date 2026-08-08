import "server-only";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/lib/convex-api";
import { getStripe, toMinorUnits } from "@/lib/stripe";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Mirrors a Convex invoice into Stripe and returns where to pay it.
 *
 * Extracted from /api/stripe/issue because there are now TWO callers with
 * different authority: the admin dialog, which proves identity with a session
 * token, and the contract signing route, which is triggered by a client who
 * has just signed and is not an admin at all. The Stripe half is identical in
 * both cases — the gate is not, and it belongs to the caller.
 *
 * Emailing is NOT done here. The admin path sends InvoiceIssued; the signing
 * path deliberately sends nothing, because an email between accepting and
 * paying is a step, and every step in that window is a place to cool off.
 *
 * Stripe Invoicing rather than Checkout Sessions: project work is a one-off
 * amount with a description, a due date and a reference the client quotes, and
 * Invoicing gives them a hosted page and a real PDF without us building either.
 */

export type IssuableInvoice = {
  _id: Id<"invoices">;
  clientName: string;
  clientEmail: string;
  description: string;
  amount: number;
  currency: string;
  stage: "deposit" | "balance";
  reference: string;
  stripeInvoiceId?: string;
  stripeHostedUrl?: string;
};

export type IssueResult =
  | { ok: true; url: string | null; alreadyIssued: boolean }
  | { ok: false; error: string };

export async function issueInvoiceToStripe(
  invoice: IssuableInvoice,
  serverSecret: string,
): Promise<IssueResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe is not configured." };

  // Already mirrored: hand back the existing link rather than raising a second
  // invoice. This is what makes a retried signature safe.
  if (invoice.stripeInvoiceId) {
    return {
      ok: true,
      url: invoice.stripeHostedUrl ?? null,
      alreadyIssued: true,
    };
  }

  try {
    // Reuse a customer for the same email so a returning client keeps their
    // saved details — which is what makes Link one-click for them.
    const existing = await stripe.customers.list({
      email: invoice.clientEmail,
      limit: 1,
    });
    const customer =
      existing.data[0] ??
      (await stripe.customers.create(
        { email: invoice.clientEmail, name: invoice.clientName },
        { idempotencyKey: `cust:${invoice._id}` },
      ));

    const stripeInvoice = await stripe.invoices.create(
      {
        customer: customer.id,
        // The client pays when they choose; charging a saved card
        // automatically would be wrong for project work.
        collection_method: "send_invoice",
        days_until_due: 14,
        automatic_tax: { enabled: false },
        payment_settings: { payment_method_types: ["card", "link"] },
        description: invoice.description,
        metadata: {
          convexInvoiceId: invoice._id,
          reference: invoice.reference,
          stage: invoice.stage,
        },
      },
      // Keyed off the Convex id, so a retry of this whole function reuses the
      // same Stripe invoice rather than creating a duplicate.
      { idempotencyKey: `inv:${invoice._id}` },
    );

    await stripe.invoiceItems.create(
      {
        customer: customer.id,
        invoice: stripeInvoice.id,
        amount: toMinorUnits(invoice.amount, invoice.currency),
        currency: invoice.currency.toLowerCase(),
        description: `${invoice.description} — ${
          invoice.stage === "deposit" ? "40% deposit" : "balance on completion"
        }`,
      },
      { idempotencyKey: `item:${invoice._id}` },
    );

    const finalised = await stripe.invoices.finalizeInvoice(stripeInvoice.id!);

    await fetchMutation(api.invoices.attachStripe, {
      secret: serverSecret,
      id: invoice._id,
      stripeInvoiceId: finalised.id!,
      stripeCustomerId: customer.id,
      stripeHostedUrl: finalised.hosted_invoice_url ?? undefined,
      stripePdfUrl: finalised.invoice_pdf ?? undefined,
    });

    return {
      ok: true,
      url: finalised.hosted_invoice_url ?? null,
      alreadyIssued: false,
    };
  } catch (err) {
    console.error("[stripe] issue failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Could not create the invoice.",
    };
  }
}
