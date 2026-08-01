import { MinimalNav } from "@/components/ui/MinimalNav";

/**
 * These pages are reached from an email, not from the site, so without this
 * they render with no logo and no way back — an unbranded page asking someone
 * to pay or sign in.
 *
 * Deliberately not the marketing layout. /portal/[token] carries its own
 * section nav down the side, and stacking the site's nav, promo banner, chat
 * pill and footer on top of it gives one page two navigations — while the
 * client is watching a clock or paying a deposit, which is the worst possible
 * moment to compete for attention.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <MinimalNav />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
