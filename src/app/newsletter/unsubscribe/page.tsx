import Link from "next/link";
import type { Metadata } from "next";
import { UnsubscribeForm } from "./UnsubscribeForm";

/**
 * Unsubscribe.
 *
 * Deliberately NOT a mutation on render, unlike the confirm page. Mail clients
 * and corporate security scanners prefetch links, and a GET that unsubscribes
 * would drop people off the list without them ever clicking anything. So the
 * page asks, and the mutation runs from an explicit action.
 *
 * The trade-off cuts the other way for confirmation: a prefetched confirm is
 * harmless, while a prefetched unsubscribe is data loss.
 */

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false, nocache: true },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-24 text-center">
      {token ? (
        <UnsubscribeForm token={token} />
      ) : (
        <>
          <h1 className="text-3xl">That link is incomplete.</h1>
          <p className="mt-4 text-secondary">
            Use the unsubscribe link from the bottom of any email, or reply and
            I&apos;ll take you off myself.
          </p>
        </>
      )}

      <Link
        href="/"
        className="mt-10 inline-block text-sm text-accent transition-colors duration-fast hover:text-primary"
      >
        Back to the site
      </Link>
    </main>
  );
}
