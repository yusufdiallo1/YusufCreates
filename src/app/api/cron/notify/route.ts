import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { sendEmail, siteUrl, adminEmail } from "@/lib/email";
import { logEmailSend } from "@/lib/emailLog";
import { getStripe } from "@/lib/stripe";
import { BuildOverdue } from "@emails/BuildOverdue";
import { DepositReminder } from "@emails/DepositReminder";
import { RequestExpired } from "@emails/RequestExpired";
import { AdminAlert } from "@emails/AdminAlert";
import { ADMIN_PATH } from "@/lib/constants";

/**
 * Drains the automation queues: sends the emails and raises the invoices that
 * the Convex sweeps decided were due.
 *
 * Split this way because Convex can do neither. The sweeps run on a cron
 * inside Convex, decide WHAT should happen and stamp the row; this route runs
 * on a Vercel cron, reads those stamps and does the parts that need the
 * outside world — Resend and Stripe.
 *
 * The consequence worth knowing: a row is marked "decided" before it is
 * marked "sent". If this route never runs, balances are still waived and
 * requests still expire — the client just is not told. That is the right way
 * round. The money decision must not depend on an email delivering.
 *
 * ⚠ SCHEDULE: daily (`0 6 * * *` in vercel.json), NOT every fifteen minutes.
 * Vercel's Hobby plan rejects any cron that runs more than once a day, and it
 * rejects it at DEPLOY time — a fifteen-minute expression fails the whole
 * deployment, not just the job. Do not put it back without checking the plan.
 *
 * What that costs: a queued email can wait up to a day. What it does not cost
 * is correctness — the sweeps in convex/automation.ts still run every 5, 15
 * and 60 minutes on Convex's own cron, which has no such limit, so waivers,
 * expiries and invoices all still happen on time. Only the telling is late.
 *
 * Worth revisiting if express volume grows: either upgrade the plan, or move
 * the sending into a Convex action so the whole loop runs on one scheduler.
 *
 * Gated by EMAIL_LOG_SECRET, the same shared secret the Stripe webhook uses
 * to call privileged mutations. Without it anyone could trigger a send.
 */

export const runtime = "nodejs";

/** Matches EXPIRE_AFTER_MS in convex/automation.ts. */
const EXPIRE_DAYS = 7;

/**
 * Two callers are allowed: Vercel Cron, and me with the shared secret.
 *
 * Vercel signs its scheduled invocations with CRON_SECRET when that variable
 * is set on the project — it sends `Authorization: Bearer <CRON_SECRET>`.
 * Without it, a Vercel cron path is publicly callable by anyone who guesses
 * the URL, and this one sends email.
 *
 * EMAIL_LOG_SECRET is accepted too so the job can be triggered by hand while
 * testing, using the secret already needed to reach the privileged mutations
 * underneath.
 */
function authorised(request: Request): boolean {
  const auth = request.headers.get("authorization");

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const shared = process.env.EMAIL_LOG_SECRET;
  if (shared && auth === `Bearer ${shared}`) return true;
  if (shared && request.headers.get("x-cron-secret") === shared) return true;

  return false;
}

export async function POST(request: Request) {
  if (!isConvexConfigured) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const secret = process.env.EMAIL_LOG_SECRET!;
  const sent: string[] = [];
  const failed: string[] = [];

  /* ------------------------------------------------------ notifications --- */

  const pending = await fetchQuery(api.automation.pendingNotificationsPublic, {
    secret,
  });

  for (const row of pending) {
    const portalUrl = `${siteUrl()}/portal/${row.token}`;
    const money = (minor: number) =>
      (minor / 100).toLocaleString("en-US", {
        style: "currency",
        currency: row.currency.toUpperCase(),
      });

    let subject: string;
    let react;

    if (row.kind === "overdue") {
      subject = "I missed the deadline — the balance is written off";
      react = BuildOverdue({
        name: row.name,
        balance: money(row.balanceAmount),
        portalUrl,
        isExpress: row.isExpress,
      });
    } else if (row.kind === "reminder") {
      subject = "Still holding your slot";
      react = DepositReminder({
        name: row.name,
        deposit: money(row.depositAmount),
        portalUrl,
        isExpress: row.isExpress,
        daysLeft: EXPIRE_DAYS - 2,
      });
    } else {
      subject = "I've closed your request";
      react = RequestExpired({ name: row.name });
    }

    const result = await sendEmail({ to: row.email, subject, react });
    await logEmailSend({
      to: row.email,
      template: `Build${row.kind}`,
      subject,
      result,
    });

    if (result.status === "sent") {
      // Only a real send clears the queue. A failure leaves the row for the
      // next run rather than marking a client as told when they were not.
      await fetchMutation(api.automation.markNotifiedPublic, {
        secret,
        id: row.id,
        kind: row.kind,
      });
      sent.push(`${row.kind}:${row.name}`);
    } else {
      failed.push(`${row.kind}:${row.name}:${result.status}`);
    }
  }

  /* ------------------------------------------------------ admin alerts --- */

  /*
   * Things that need ME, sent to my own address.
   *
   * Separate from the client notifications above because the failure mode is
   * different: a client email that does not arrive is a bad experience, but
   * an alert that does not arrive means a two-hour clock running against a
   * question I never saw.
   */
  const admin = adminEmail();
  if (admin) {
    const alerts = await fetchQuery(api.automation.adminAlertsPublic, { secret });

    for (const a of alerts) {
      const subject =
        a.kind === "new"
          ? `New request — ${a.name}`
          : a.kind === "paid"
            ? `Paid, waiting on you — ${a.name}`
            : `Message from ${a.name}`;

      const result = await sendEmail({
        to: admin,
        subject,
        // Replying goes straight to the client rather than to myself.
        replyTo: a.email,
        react: AdminAlert({
          kind: a.kind,
          name: a.name,
          email: a.email,
          plan: a.plan,
          preview: a.preview,
          adminUrl: `${siteUrl()}${ADMIN_PATH}/express`,
        }),
      });

      await logEmailSend({ to: admin, template: `AdminAlert-${a.kind}`, subject, result });

      if (result.status === "sent") {
        await fetchMutation(api.automation.markAlertedPublic, {
          secret,
          id: a.id,
          kind: a.kind,
        });
        sent.push(`alert-${a.kind}:${a.name}`);
      } else {
        failed.push(`alert-${a.kind}:${a.name}:${result.status}`);
      }
    }
  }

  /* ----------------------------------------------------------- invoices --- */

  const invoices = await fetchQuery(api.automation.pendingInvoicesPublic, {
    secret,
  });

  const stripe = getStripe();
  const raised: string[] = [];

  for (const row of invoices) {
    const created = await fetchMutation(api.automation.raiseBalanceInvoicePublic, {
      secret,
      id: row.id,
    });
    if (!created) continue;

    raised.push(row.name);

    // Stripe is optional here: the invoice row exists either way, and can be
    // sent by hand from the admin if Stripe is not configured.
    if (!stripe) continue;

    try {
      const customer = await stripe.customers.create({
        email: row.email,
        name: row.name,
      });
      await stripe.invoiceItems.create({
        customer: customer.id,
        amount: row.amount,
        currency: row.currency,
        description: `Balance — ${row.name}`,
      });
      const invoice = await stripe.invoices.create({
        customer: customer.id,
        collection_method: "send_invoice",
        days_until_due: 7,
        metadata: { convexInvoiceId: created.invoiceId },
      });
      if (invoice.id) await stripe.invoices.sendInvoice(invoice.id);
    } catch (err) {
      // The row is already created and stamped; a Stripe failure means it has
      // to go out by hand, not that it should be raised twice.
      failed.push(
        `invoice:${row.name}:${err instanceof Error ? err.message : "stripe error"}`,
      );
    }
  }

  /* ------------------------------------------------------------- digest --- */

  // Logged only when something happened. A line every fifteen minutes saying
  // "nothing to report" trains you to scroll past the one that does.
  if (sent.length > 0 || raised.length > 0 || failed.length > 0) {
    console.info(
      `[cron/notify] sent=${sent.length} invoices=${raised.length} failed=${failed.length}`,
    );
  }

  return NextResponse.json({
    ok: true,
    sent: sent.length,
    invoicesRaised: raised.length,
    failed,
  });
}
