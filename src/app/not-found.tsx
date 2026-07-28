import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
};

/**
 * 404.
 *
 * Offers the routes people actually land here looking for, rather than a
 * search box nobody uses or a bare "go home" link. A 404 is a navigation
 * failure, and the fix is navigation.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-lg flex-col justify-center px-6 py-24">
      <p className="font-mono text-xs tracking-[0.1em] text-secondary uppercase">
        404
      </p>
      <h1 className="mt-4 text-3xl">That page isn&apos;t here.</h1>
      <p className="mt-3 text-secondary">
        It may have moved, or the link may be slightly off. These are the
        pages people usually want:
      </p>

      <ul className="mt-8 space-y-1">
        {[
          { href: "/", label: "Home" },
          { href: "/work", label: "Work" },
          { href: "/services", label: "Services" },
          { href: "/pricing", label: "Pricing" },
          { href: "/start", label: "Start a project" },
        ].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block py-2 text-primary transition-colors duration-fast hover:text-accent"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-secondary">
        Certain it should exist?{" "}
        <a href="mailto:hello@yusufcreates.com" className="text-accent">
          Tell me
        </a>{" "}
        and I&apos;ll fix the link.
      </p>
    </main>
  );
}
