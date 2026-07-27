import { PRICING_TIERS } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className="rounded-xl border border-black/10 p-6 dark:border-white/15"
          >
            <h2 className="font-medium">{tier.name}</h2>
            <p className="mt-1 text-sm opacity-70">{tier.description}</p>
            <p className="mt-4 text-2xl font-semibold">
              {formatCurrency(tier.price.month)}
              <span className="text-sm font-normal opacity-60">/mo</span>
            </p>
            <ul className="mt-4 space-y-1 text-sm opacity-80">
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
