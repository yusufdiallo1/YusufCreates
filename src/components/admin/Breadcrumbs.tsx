"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_PATH } from "@/lib/constants";

/**
 * Breadcrumbs derived from the path.
 *
 * Generated rather than passed down per page, so a new route cannot ship
 * without them. Ids in the path (Convex ids are long opaque strings) are
 * shown as a short label instead of 32 characters of noise.
 */

const LABELS: Record<string, string> = {
  admin: "Admin",
  /*
   * The root segment, and the most repeated string in the product.
   *
   * Without an entry here it fell through to the de-hyphenating fallback and
   * rendered "Yusuf diallo creates" — lowercase d, three words, on every
   * single admin page. Derived from ADMIN_PATH so a rename of the route
   * cannot leave this pointing at a segment that no longer exists.
   */
  [ADMIN_PATH.replace(/^\//, "")]: "YusufCreates",
  leads: "Leads",
  analytics: "Analytics",
  projects: "Projects",
  testimonials: "Testimonials",
  feedback: "Feedback",
  broadcasts: "Broadcasts",
  blog: "Blog",
  kb: "AI",
  invoices: "Invoices",
  proposals: "Proposals",
  contracts: "Contracts",
  clients: "Clients",
  content: "Content",
  promos: "Promotions",
  /* One name for this concept: the sidebar, the breadcrumb and the page title
     all said something different — "Express builds", "Express", "Requests". */
  express: "Express",
  audits: "Site audits",
  waitlist: "Waitlist",
  subscribers: "Subscribers",
  settings: "Settings",
  new: "New",
};

function labelFor(segment: string): string {
  if (LABELS[segment]) return LABELS[segment];
  // Convex ids are opaque and long; showing one in a breadcrumb helps nobody.
  if (segment.length > 16 && !segment.includes("-")) return "Detail";
  return segment.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-secondary">
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const last = index === segments.length - 1;

          return (
            <li key={href} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-muted">
                  /
                </span>
              ) : null}
              {last ? (
                <span aria-current="page" className="text-primary">
                  {labelFor(segment)}
                </span>
              ) : (
                <Link
                  href={href}
                  className="transition-colors duration-hover ease-hover hover:text-primary"
                >
                  {labelFor(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
