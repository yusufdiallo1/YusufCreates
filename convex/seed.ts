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
      {
        slug: "stopwatch",
        title: "StopWatch",
        client: "Personal project",
        year: 2026,
        category: "Web app",
        coverUrl: "/work/stopwatch.jpg",
        liveUrl: "https://stopwatchapp-omega.vercel.app/",
        status: "published" as const,
        order: 3,
        featured: false,
        summary:
          "A focus timer, stopwatch, world clock and countdown in one calm interface.",
        problem:
          "Most timer apps either do one thing and stop, or bury four tools behind a cluttered toolbar. Neither is pleasant to keep open on a second monitor all day.",
        process:
          "Four modes behind a single sidebar, with Pomodoro blocks that track which round you are on and roll into breaks automatically. The running clock stays visible so the app doubles as a desk clock, and the whole thing follows the system light and dark preference.",
        result:
          "Runs entirely in the browser with no account and no backend.",
        techStack: ["React", "TypeScript", "Tailwind CSS", "Vite", "Vercel"],
      },
      {
        slug: "weather",
        title: "Weather",
        client: "Personal project",
        year: 2026,
        category: "Web app",
        coverUrl: "/work/weather.jpg",
        liveUrl: "https://weather-opal-five-94.vercel.app/",
        status: "published" as const,
        order: 4,
        featured: false,
        summary:
          "Current conditions, hourly and seven-day forecasts, with an honest fallback when the API is unreachable.",
        problem:
          "Weather sites bury the number you actually want under advertising, and most fail silently or show stale figures when their data source is down.",
        process:
          "Live data with a clear hierarchy: temperature first, then wind, gusts, humidity, UV, rain chance and pressure. When the forecast API cannot be reached the app switches to clearly labelled sample data and says so in a banner rather than presenting invented numbers as real.",
        result:
          "Saved places, hourly and seven-day views, and a fallback state that never misleads.",
        techStack: ["React", "TypeScript", "Tailwind CSS", "Vite", "Vercel"],
      },
      {
        slug: "margin-notes",
        title: "Margin",
        client: "Personal project",
        year: 2026,
        category: "Web app",
        coverUrl: "/work/margin-notes.jpg",
        liveUrl: "https://margin-chi-five.vercel.app/",
        status: "published" as const,
        order: 5,
        featured: false,
        summary:
          "A markdown note-taking app with separate writing and reading modes.",
        problem:
          "Note apps tend to force a choice between a plain textarea and a heavy editor that fights you over formatting.",
        process:
          "Markdown with a split between Write and Read, so drafting and reviewing are distinct states rather than a preview pane competing for width. Search across all notes, a built-in syntax cheatsheet, and local persistence so nothing is lost on refresh.",
        result: "No account required; notes stay on the device.",
        techStack: ["React", "TypeScript", "Tailwind CSS", "Vite", "Vercel"],
      },
      {
        slug: "ledger-budget",
        title: "Ledger",
        client: "Personal project",
        year: 2026,
        category: "Web app",
        coverUrl: "/work/ledger-budget.jpg",
        liveUrl: "https://ledger-beta-lovat-14.vercel.app/",
        status: "published" as const,
        order: 6,
        featured: false,
        summary:
          "A budget tracker that answers one question first: how much is left this month.",
        problem:
          "Budgeting tools open on a wall of transactions. The number people actually want — what is left — is somewhere further down.",
        process:
          "The remaining balance leads, with money in and money out beside it. Below that, spending by category as a donut, a per-day bar chart to surface unusual days, and the transaction list last. Sample transactions ship pre-loaded and clearly labelled so the charts are not empty on first open, with one button to clear them.",
        result:
          "Monthly navigation, category budgets, and multi-currency display.",
        techStack: ["React", "TypeScript", "Recharts", "Tailwind CSS", "Vercel"],
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
