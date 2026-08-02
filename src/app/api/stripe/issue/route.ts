import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { getStripe, toMinorUnits } from "@/lib/stripe";
import { sendEmail } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { InvoiceIssued } from "@emails/InvoiceIssued";

/**
 * Issues an invoice: mirrors a Convex invoice into Stripe and emails the link.
 *
 * Stripe Invoicing rather than Checkout Sessions. Checkout is built for
 * products with prices; project work is a one-off amount with a description, a
 * due date and a reference the client quotes. Invoicing also gives the client
 * a hosted page and a real PDF without us building either.
 *
 * Admin identity is re-verified here from the session token. The invoice id is
 * caller-supplied, so without this check anyone could issue an invoice — and
 * issuing sends an email demanding money.
 */

export const runtime = "nodejs";

/*
 * NOTE ON WALLETS — why the tier is not consulted here.
 *
 * Apple Pay and Google Pay have no value in `payment_method_types`; they are
 * card-backed and ride on "card". Stripe states plainly that they cannot be
 * excluded per transaction via the API, and the `wallets` hash that would
 * control them is an Elements-level parameter the Invoices API does not
 * expose. So on a Stripe-HOSTED invoice, offering card necessarily offers
 * Apple Pay to anyone whose device has it.
 *
 * Wallet gating therefore lives in the embedded portal payment
 * (see src/app/api/stripe/intent/route.ts), which uses Elements and can
 * actually enforce it. This route stays the fallback rail for anyone paying
 * from an emailed link, where the distinction is not enforceable.
 */

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || !isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const token = await convexAuthNextjsToken();
  const allowed = await fetchQuery(api.admin.amIAdmin, {}, { token }).catch(
    () => false,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const serverSecret = process.env.EMAIL_LOG_SECRET;
  if (!serverSecret) {
    return NextResponse.json({ error: "Server secret unset." }, { status: 500 });
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Missing invoice id." }, { status: 400 });
  }

  const invoice = await fetchQuery(
    api.invoices.getById,
    { id: body.id as never },
    { token },
  ).catch(() => null);

  if (!invoice) {
    return NextResponse.json({ error: "No such invoice." }, { status: 404 });
  }
  if (invoice.stripeInvoiceId) {
    return NextResponse.json(
      { error: "Already issued.", url: invoice.stripeHostedUrl },
      { status: 409 },
    );
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
        // The client is emailed a link and pays when they choose; charging a
        // saved card automatically would be wrong for project work.
        collection_method: "send_invoice",
        days_until_due: 14,
        automatic_tax: { enabled: false },
        payment_settings: {
          payment_method_types: ["card", "link"],
        },
        description: invoice.description,
        // Our reference, so a bank line or a client email can be matched back.
        metadata: {
          convexInvoiceId: invoice._id,
          reference: invoice.reference,
          stage: invoice.stage,
        },
      },
      { idempotencyKey: `inv:${invoice._id}` },
    );

    await stripe.invoiceItems.create(
      {
        customer: customer.id,
        invoice: stripeInvoice.id,
        amount: toMinorUnits(invoice.amount, invoice.currency),
        currency: invoice.currency.toLowerCase(),
        description: `${invoice.description} — ${invoice.stage === "deposit" ? "40% deposit" : "balance on completion"}`,
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

    // Our own branded email carries the link, rather than Stripe's default —
    // the client should recognise who is asking them for money.
    const subject = `Invoice ${invoice.reference} — ${invoice.clientName}`;
    const result = await sendEmail({
      to: invoice.clientEmail,
      subject,
      react: InvoiceIssued({
        name: invoice.clientName,
        reference: invoice.reference,
        description: invoice.description,
        amount: invoice.amount,
        currency: invoice.currency,
        stage: invoice.stage,
        payUrl: finalised.hosted_invoice_url ?? "",
      }),
    });
    await logEmailSend({
      to: invoice.clientEmail,
      template: "InvoiceIssued",
      subject,
      result,
    });

    /*
     * Report whether the email actually went.
     *
     * sendEmail never throws — it returns {status:"failed"} — and this used
     * to return ok:true regardless, so a send that failed looked exactly
     * like one that worked. The invoice is already stamped with its
     * stripeInvoiceId by this point, so the "Already issued" guard rejects
     * every retry: the client was never told they owe anything, and the one
     * route that could tell them refuses to run again.
     *
     * The invoice IS raised either way — that part succeeded, and saying
     * otherwise would be its own lie — so this reports partial success and
     * names the thing that still needs doing.
     */
    const emailed = result.status === "sent";

    return NextResponse.json({
      ok: true,
      emailed,
      url: finalised.hosted_invoice_url,
      ...(emailed
        ? {}
        : {
            warning:
              "The invoice was raised but the email did not send. Send the payment link to the client by hand.",
          }),
    });
  } catch (err) {
    console.error("[stripe] issue failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create the invoice.",
      },
      { status: 502 },
    );
  }
}
