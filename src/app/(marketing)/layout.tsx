import Link from "next/link";
import { MARKETING_NAV, SITE } from "@/lib/constants";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-black/10 dark:border-white/15">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            {SITE.name}
          </Link>
          <ul className="flex items-center gap-6 text-sm">
            {MARKETING_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="opacity-70 hover:opacity-100">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-black/10 px-6 py-8 text-sm opacity-60 dark:border-white/15">
        <div className="mx-auto max-w-5xl">
          © {new Date().getFullYear()} {SITE.name}
        </div>
      </footer>
    </div>
  );
}
