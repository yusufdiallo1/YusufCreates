import Link from "next/link";
import { ADMIN_NAV, SITE } from "@/lib/constants";

/**
 * Admin shell. Auth gating belongs here — once Convex Auth is wired up,
 * redirect unauthenticated visitors before rendering `children`.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-black/10 p-6 dark:border-white/15">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {SITE.name}
        </Link>
        <nav className="mt-6">
          <ul className="space-y-2 text-sm">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="opacity-70 hover:opacity-100">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
