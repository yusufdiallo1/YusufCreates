import { MinimalNav } from "@/components/ui/MinimalNav";

/**
 * These pages are reached from an email, not from the site, so without this
 * they render with no logo and no way back — an unbranded page asking someone
 * to pay or sign in.
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
