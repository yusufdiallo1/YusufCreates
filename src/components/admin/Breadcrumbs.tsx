"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Breadcrumbs derived from the path.
 *
 * Generated rather than passed down per page, so a new route cannot ship
 * without them. Ids in the path (Convex ids are long opaque strings) are
 * shown as a short label instead of 32 characters of noise.
 */

const LABELS: Record<string, string> = {
  admin: "Admin",
  leads: "Leads",
  analytics: "Analytics",
  projects: "Projects",
  testimonials: "Testimonials",
  feedback: "Feedback",
  broadcasts: "Broadcasts",
  blog: "Blog",
  kb: "Knowledge base",
  invoices: "Proposals and invoices",
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
                <span aria-hidden="true" className="text-secondary/60">
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
                  className="transition-colors duration-fast hover:text-primary"
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
