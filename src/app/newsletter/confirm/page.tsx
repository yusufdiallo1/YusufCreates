import Link from "next/link";
import type { Metadata } from "next";
import { fetchMutation } from "convex/nextjs";
import { api, isConvexConfigured } from "@/lib/convex-api";

/**
 * Double opt-in landing page.
 *
 * Runs the mutation on the server during render, so the subscription is
 * confirmed even with JavaScript disabled — a confirmation link that needs a
 * hydrated client is a confirmation link that quietly fails for some people.
 */

export const metadata: Metadata = {
  title: "Confirm your subscription",
  // The URL carries a credential. Keeping it out of search indexes matters.
  robots: { index: false, follow: false, nocache: true },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let ok = false;
  if (token && isConvexConfigured) {
    try {
      const result = await fetchMutation(api.subscribers.confirm, { token });
      ok = result.ok;
    } catch {
      ok = false;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-24 text-center">
      {ok ? (
        <>
          <h1 className="text-3xl">You&apos;re on the list.</h1>
          <p className="mt-4 text-secondary">
            Occasional notes on what I&apos;m building, what broke, and what
            I&apos;d do differently. You can leave any time — every email has a
            one-click unsubscribe.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl">That link didn&apos;t work.</h1>
          <p className="mt-4 text-secondary">
            It may have already been used, or it was only partly copied. Signing
            up again will send a fresh one.
          </p>
        </>
      )}

      <Link
        href="/"
        className="mt-10 inline-block text-sm text-accent transition-colors duration-hover ease-hover hover:text-primary"
      >
        Back to the site
      </Link>
    </main>
  );
}
