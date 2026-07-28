import { internalMutation } from "./_generated/server";

/**
 * Seed the two DocuTrackr case studies.
 *
 * internalMutation, so this is not callable from the browser — only from the
 * CLI or the dashboard. Re-running it updates the existing rows by slug rather
 * than creating duplicates.
 *
 * Copy is drawn from the founder's own description of each product. Metrics
 * are limited to facts stated there (pricing, tiers, country counts); nothing
 * is invented, and no traffic or revenue figures are claimed.
 */
export const seedProjects = internalMutation({
  args: {},
  handler: async (ctx) => {
    const projects = [
      {
        slug: "docutrackr-family",
        title: "DocuTrackr Family",
        client: "DocuTrackr",
        year: 2026,
        category: "Consumer SaaS",
        coverUrl: "/work/docutrackr-family.jpg",
        liveUrl: "https://www.docutrackr.app",
        status: "published" as const,
        order: 1,
        featured: true,
        summary:
          "A document vault for families that catches passport and visa expiries before they become emergencies.",
        problem:
          "Passports, visas and residency documents sit scattered across email threads, photo libraries and desk drawers. People miss renewal windows not through carelessness but because nothing is tracking the dates, and a lapsed passport is discovered at the airport rather than at home.",
        process:
          "OCR runs entirely in the browser with Tesseract.js, so no document ever leaves the device. On top of that sits a tiered alert schedule at 90, 60, 30 and 7 days, a six-month passport rule check cross-referenced against upcoming flights via live AeroDataBox data, household sharing for up to ten members, and a Peace of Mind Score that reduces overall document health to a single number. Sensitive fields are encrypted with AES-256-GCM, and Cloudflare sits at the upload boundary only.",
        result:
          "Launched publicly with real paying users, on a Free, Family and Lifetime pricing ladder.",
        metrics: [
          { label: "Household members supported", value: 10 },
          { label: "Peace of Mind Score range", value: 100 },
          { label: "Family plan, USD per month", value: 3.49, decimals: 2 },
        ],
        techStack: [
          "Next.js",
          "Convex",
          "Stripe",
          "Resend",
          "Vercel",
          "Tesseract.js",
        ],
      },
      {
        slug: "docutrackr-business",
        title: "DocuTrackr Business",
        client: "DocuTrackr",
        year: 2026,
        category: "B2B SaaS",
        coverUrl: "/work/docutrackr-business.jpg",
        liveUrl: "https://business.docutrackr.app",
        status: "published" as const,
        order: 2,
        featured: true,
        summary:
          "HR document compliance for GCC companies, replacing the spreadsheet that quietly costs them fines.",
        problem:
          "HR teams across the UAE, Saudi Arabia, Qatar and Kuwait track hundreds of employee visas, medical certificates and work permits by hand. A missed renewal is not an inconvenience: it triggers fines and can ground an employee entirely.",
        process:
          "Team onboarding with role-based access, renewal guides covering 87 countries with real fee and lead-time data, and AI contract extraction that pulls parties, dates and risks from uploaded PDFs and flags renewal clauses automatically. A daily compliance report scores the organisation out of 100, and shared folders carry access logs. Privacy-first throughout: OCR on-device, Cloudflare only at sign-in and upload.",
        result:
          "Shipped with a card-required seven-day trial, Starter and Business tiers, an Enterprise tier with custom budgets, and a founder-facing admin dashboard for org and billing oversight.",
        metrics: [
          { label: "Countries with renewal guides", value: 87 },
          { label: "Compliance score, out of", value: 100 },
          { label: "Trial length, days", value: 7 },
        ],
        techStack: [
          "Next.js",
          "Convex",
          "Stripe",
          "Claude",
          "Vercel",
          "TypeScript",
        ],
      },
    ];

    for (const project of projects) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_slug", (q) => q.eq("slug", project.slug))
        .unique();

      if (existing) await ctx.db.patch(existing._id, project);
      else await ctx.db.insert("projects", project);
    }

    return { seeded: projects.length };
  },
});
