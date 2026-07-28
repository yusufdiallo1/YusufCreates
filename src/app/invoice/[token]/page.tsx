import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { getBankDetails } from "@/lib/bank";
import { InvoiceView } from "./InvoiceView";

/**
 * Invoice page, reachable only with the token.
 *
 * noindex, nofollow and nocache: bank details must never be crawled, cached by
 * an intermediary, or turn up in search results.
 */
export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false, nocache: true },
};

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isConvexConfigured) notFound();

  const invoice = await fetchQuery(api.invoices.getByToken, { token }).catch(
    () => null,
  );
  // An unknown, draft or voided token is a 404 rather than an error page —
  // nothing should confirm to a guesser that a token nearly matched.
  if (!invoice) notFound();

  const bank = getBankDetails();

  return <InvoiceView invoice={invoice} bank={bank} token={token} />;
}
