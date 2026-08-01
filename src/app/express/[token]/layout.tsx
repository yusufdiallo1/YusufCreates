import { MinimalNav } from "@/components/ui/MinimalNav";

/**
 * Same shell as /portal/[token], which is where this route now redirects in
 * spirit — both render the same portal, and links already sent out point
 * here.
 *
 * Deliberately NOT the marketing layout. A client watching a two-hour clock
 * run down does not need a promo banner, a services menu and a chat pill
 * competing with it; the portal carries its own section nav, and a second
 * one above it is two navigations for one page.
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
