"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { FieldError } from "@/components/ui/FieldError";
import { playConfirmation } from "@/lib/sound";

/**
 * Paying the deposit from inside the portal.
 *
 * Embedded rather than a redirect, for the same reason as the invoice panel:
 * handing someone to another domain at the moment they part with money is
 * when a project feels least trustworthy. It matters more here, because for
 * an express build paying is what STARTS the two-hour clock — a detour
 * through a hosted page is time on their side of the deadline.
 *
 * Card details are rendered by Stripe in an iframe. They never touch this
 * component, this bundle, or our servers.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Module scope: loadStripe injects a script, and calling it per render would
// re-inject on every state change.
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type Build = {
  status: string;
  currency: string;
  depositAmount: number;
  balanceAmount: number;
  depositPaidAt: number | null;
  balancePaidAt: number | null;
  balanceWaived: boolean;
  plan?: string;
};

export function BuildPayment({
  token,
  build,
}: {
  token: string;
  build: Build;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const money = (minor: number) =>
    (minor / 100).toLocaleString("en-US", {
      style: "currency",
      currency: build.currency.toUpperCase(),
    });

  /*
   * Two stages are payable, and they are mutually exclusive.
   *
   * The deposit unlocks the work starting; the balance releases the finished
   * site. Both use the same embedded panel because the reason is the same —
   * handing someone to another domain at the moment they part with money is
   * when a project feels least trustworthy.
   */
  const stage: "deposit" | "balance" | null =
    build.status === "awaiting_payment"
      ? "deposit"
      : build.status === "delivered" &&
          !build.balanceWaived &&
          !build.balancePaidAt &&
          build.balanceAmount > 0
        ? "balance"
        : null;

  const payable = stage !== null;

  useEffect(() => {
    if (!payable) return;
    let live = true;

    fetch("/api/stripe/build-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, stage }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!live) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load the payment.");
          return;
        }
        setClientSecret(data.clientSecret);
      })
      .catch(() => {
        if (live) setError("Could not reach the payment service.");
      });

    return () => {
      live = false;
    };
  }, [token, payable, stage]);

  // Nothing to pay yet — say which, rather than showing an empty panel.
  if (build.status === "pending_approval") {
    return (
      <Panel title="Nothing to pay yet">
        I have not accepted this brief yet, so there is nothing owed. You will
        get an email the moment I do, and the deposit becomes payable here.
      </Panel>
    );
  }

  if (build.status === "declined") {
    return (
      <Panel title="Nothing owed">
        I could not take this one on, and nothing has been charged.
      </Panel>
    );
  }

  if (build.depositPaidAt && stage !== "balance" && build.status !== "delivered") {
    return (
      <Panel title="Deposit received">
        {money(build.depositAmount)} paid. The remaining{" "}
        {money(build.balanceAmount)} is only due if I deliver on time.
      </Panel>
    );
  }

  if (build.status === "delivered" && stage === null) {
    return (
      <Panel title="Nothing further owed">
        {build.balanceWaived
          ? `I missed the window, so the remaining ${money(build.balanceAmount)} is written off.`
          : "The balance is settled. Your site is on the overview."}
      </Panel>
    );
  }

  if (!stripePromise) {
    return (
      <Panel title="Payments not configured">
        Card payment is not set up on this deployment yet.
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Payment">
        <FieldError>{error}</FieldError>
      </Panel>
    );
  }

  if (!clientSecret) {
    return <Panel title="Payment">Loading payment…</Panel>;
  }

  return (
    <div className="hairline rounded-xl bg-surface-1 p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-primary">
          {stage === "balance" ? "Balance" : "Deposit"}
        </p>
        <p className="text-lg text-primary">
          {money(stage === "balance" ? build.balanceAmount : build.depositAmount)}
        </p>
      </div>
      <p className="mt-1.5 mb-5 text-sm text-secondary">
        {stage === "balance"
          ? "This releases the finished site. The link appears on your overview the moment it clears."
          : (build.plan ?? "express") === "express"
            ? "The two hours start the moment this clears — not before. Pay when you are ready for me to begin."
            : "I start as soon as this clears."}
      </p>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          // Rendered in an iframe, so it inherits none of our CSS. These
          // restate the design tokens Stripe actually accepts.
          appearance: {
            theme: "night",
            variables: {
              // The site's own tokens, restated as hex. Stripe renders in
              // an iframe where var() resolves to nothing, so these must be
              // literal — and they had drifted to an amber-on-brown palette
              // that belongs to no part of this site.
              colorPrimary: "#5e6ad2",
              colorBackground: "#0f1011",
              colorText: "#f7f8f8",
              colorDanger: "#f2555a",
              fontFamily: "Inter, system-ui, sans-serif",
              borderRadius: "10px",
              // 16px: anything smaller and iOS zooms the page on focus.
              fontSizeBase: "16px",
            },
          },
        }}
      >
        <DepositForm
          stage={stage ?? "deposit"}
          amount={money(
            stage === "balance" ? build.balanceAmount : build.depositAmount,
          )}
        />
      </Elements>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hairline rounded-xl bg-surface-1 p-6">
      <p className="text-primary">{title}</p>
      <div className="mt-2 text-sm text-secondary">{children}</div>
    </div>
  );
}

function DepositForm({
  amount,
  stage,
}: {
  amount: string;
  stage: "deposit" | "balance";
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="text-center">
        <p className="text-lg text-primary">Payment received.</p>
        <p className="mt-2 text-sm text-secondary">
          {stage === "balance"
            ? "That is everything settled. Your site is on the overview."
            : "The clock is running. Watch it on the overview — I am starting now."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!stripe || !elements || busy) return;

        setBusy(true);
        setError(null);

        const { error: submitError } = await stripe.confirmPayment({
          elements,
          redirect: "if_required",
        });

        if (submitError) {
          // Stripe's decline messages are written for cardholders already, so
          // they are shown as-is rather than flattened into "payment failed".
          setError(submitError.message ?? "That payment didn't go through.");
          setBusy(false);
          return;
        }

        /*
         * The webhook, not this callback, is what starts the clock in the
         * database. Someone who closes the tab at this instant must still end
         * up paid and building — so this only updates what they see.
         */
        playConfirmation();
        setDone(true);
      }}
    >
      <PaymentElement />

      <button
        type="submit"
        disabled={busy || !stripe}
        className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Paying…" : `Pay ${amount}`}
      </button>

      <FieldError>{error}</FieldError>
    </form>
  );
}
