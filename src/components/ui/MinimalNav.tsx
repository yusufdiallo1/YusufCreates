import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/**
 * Nav for focused pages — portal, invoice, proposal, newsletter.
 *
 * These pages had no navigation at all, so anyone landing on one from an email
 * had no route back to the site and no visible sign of whose site it was. On a
 * page where someone is about to pay, an unbranded screen is exactly the wrong
 * thing.
 *
 * The full marketing nav is not the answer either: a promo banner, a chat pill
 * and a menu of services while somebody pays a deposit competes for attention
 * at the one moment it should not. So this carries the logo and a way home,
 * and nothing else.
 */
export function MinimalNav() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
      <Link href="/" aria-label="YusufCreates home" className="shrink-0">
        <Logo variant="lockup" className="h-6 w-auto" />
      </Link>

      <Link
        href="/"
        className="text-sm text-secondary transition-colors duration-hover ease-hover hover:text-primary"
      >
        yusufcreates.com
      </Link>
    </header>
  );
}
