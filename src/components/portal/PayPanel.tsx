"use client";

import { useEffect, useMemo, useState } from "react";
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
 * Pay an invoice without leaving the portal.
 *
 * Stripe Elements rather than a redirect to the hosted invoice page. Handing a
 * client off to another domain to pay a 40% deposit is the moment a project
 * feels least trustworthy, and it is the moment they are parting with the most
 * money on faith.
 *
 * The card details are rendered by Stripe inside an iframe — they never touch
 * this component, this bundle, or our servers. That is what keeps us out of
 * SCA and PCI scope, and it is why there is no card form here to read.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Created once at module scope: loadStripe injects a script, and calling it per
// render would re-inject on every state change.
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type Intent = {
  clientSecret: string;
  amount: number;
  currency: string;
  reference: string;
  stage: "deposit" | "balance";
};

export function PayPanel({ token }: { token: string }) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    fetch("/api/stripe/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!live) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load the payment.");
          return;
        }
        setIntent(data);
      })
      .catch(() => {
        if (live) setError("Could not reach the payment service.");
      });

    return () => {
      live = false;
    };
  }, [token]);

  if (!stripePromise) {
    return (
      <p className="text-sm text-secondary">
        Payments aren&apos;t configured yet.
      </p>
    );
  }

  if (error) return <FieldError>{error}</FieldError>;

  if (!intent) {
    return <p className="text-sm text-secondary">Loading payment…</p>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: intent.clientSecret,
        // Elements is rendered in an iframe, so it inherits none of our CSS.
        // These values restate the design tokens Stripe actually accepts.
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
      <PayForm intent={intent} />
    </Elements>
  );
}

function PayForm({ intent }: { intent: Intent }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const amountLabel = useMemo(
    () =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: intent.currency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(intent.amount),
    [intent.amount, intent.currency],
  );

  if (done) {
    return (
      <div className="text-center">
        <p className="text-lg text-primary">Payment received.</p>
        <p className="mt-2 text-sm text-secondary">
          A receipt is on its way. Your project status updates here as work
          progresses — nothing else is needed from you right now.
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
          // Stripe's decline messages are already written for cardholders, so
          // they are shown as-is rather than flattened into "payment failed".
          setError(submitError.message ?? "That payment didn't go through.");
          setBusy(false);
          return;
        }

        /*
         * The webhook, not this callback, is what marks the invoice paid in
         * the database. A client who closes the tab at this instant must still
         * end up paid — so this only updates what they see.
         */
        playConfirmation();
        setDone(true);
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-secondary">
          {intent.stage === "deposit" ? "40% deposit" : "Balance"}
        </span>
        <span className="text-2xl text-primary">{amountLabel}</span>
      </div>

      <p className="mt-1 text-xs text-secondary">Ref {intent.reference}</p>

      <div className="rule my-5" />

      <PaymentElement
        options={{
          layout: "tabs",
          /*
           * Apple Pay and Google Pay, on every tier.
           *
           * This hash was the actual gate — `applePay: "never"` — and it was
           * gating the wrong way round. Wallets were reserved for Enterprise
           * as a premium convenience, but a large enterprise invoice goes
           * through procurement and is never paid by thumb, while a small
           * deposit is exactly the payment someone settles on a phone in
           * seconds. The restriction withheld the feature from the invoices
           * it helps most.
           *
           * "auto" rather than "always": Stripe shows each wallet only where
           * the device and the account can actually complete it, so this asks
           * for them without promising a button that cannot work.
           */
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />

      <button
        type="submit"
        disabled={!stripe || busy}
        className="mt-6 w-full rounded-full bg-[color:var(--accent-solid)] px-6 py-3 text-sm font-medium text-white transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Paying…" : `Pay ${amountLabel}`}
      </button>

      {error ? <FieldError>{error}</FieldError> : null}

      <p className="mt-4 text-center text-xs text-secondary">
        Card details go straight to Stripe. They never reach this site.
      </p>
    </form>
  );
}
