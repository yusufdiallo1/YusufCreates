"use client";

import { useState } from "react";
import { ProjectsAdmin } from "@/components/admin/ProjectsAdmin";
import { BlogAdmin } from "@/components/admin/BlogAdmin";
import { TestimonialsAdmin } from "@/components/admin/TestimonialsAdmin";

/**
 * Everything that goes on the public site, in one place.
 *
 * Portfolio, blog and testimonials were three sidebar entries and three
 * pages, which made the admin look like it had more to manage than it does —
 * and none of them is a daily job. They are the same task from my side:
 * publish something, or edit something already published.
 *
 * Tabs rather than three routes, because they are compared against each other
 * far more often than any of them is worked on alone: adding a case study
 * usually means adding the testimonial that came with it.
 *
 * State is local rather than in the URL. These are not pages anybody links to
 * or bookmarks, and a query parameter would be one more thing to keep in step
 * with the sidebar.
 */

type Tab = "portfolio" | "blog" | "testimonials";

const TABS: { id: Tab; label: string }[] = [
  { id: "portfolio", label: "Portfolio" },
  { id: "blog", label: "Blog" },
  { id: "testimonials", label: "Testimonials" },
];

export function ContentAdmin() {
  const [tab, setTab] = useState<Tab>("portfolio");

  return (
    <div className="space-y-8">
      <div
        role="tablist"
        aria-label="Content type"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 rounded-full px-4 text-sm transition-colors duration-hover ease-hover ${
              tab === t.id
                ? "bg-surface-2 text-primary"
                : "text-secondary hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/*
        Only the active tab is mounted.

        Each of these opens its own Convex subscriptions; rendering all three
        and hiding two with CSS would keep three live queries running to show
        one list.
      */}
      <div role="tabpanel">
        {tab === "portfolio" ? <ProjectsAdmin /> : null}
        {tab === "blog" ? <BlogAdmin /> : null}
        {tab === "testimonials" ? <TestimonialsAdmin /> : null}
      </div>
    </div>
  );
}
