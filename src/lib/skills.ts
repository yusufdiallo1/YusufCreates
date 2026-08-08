/**
 * Skill data.
 *
 * Kept in a plain module rather than in Skills.tsx because that component is
 * a client component: importing a value from it in a server component yields
 * a client reference, not the array. Data lives here so both sides can read it.
 */

export interface Skill {
  name: string;
  /** What this tool is actually used for here. Specific, not generic. */
  use: string;
  /**
   * Where to send someone who wants to know what this is.
   *
   * The official docs or homepage, never an affiliate or a tutorial. Written
   * out per skill rather than derived from simple-icons' `source` field —
   * that field points at wherever the LOGO was taken from, which is usually a
   * brand-assets page or a raw file in a GitHub repo, not somewhere a reader
   * would want to land.
   *
   * Optional: "Responsive design" is a practice, not a product, so there is
   * nothing honest to link it to. Those render as plain rows.
   */
  url?: string;
}

export interface SkillGroup {
  heading: string;
  items: Skill[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    heading: "Frontend",
    items: [
      /*
       * The three the rest is built on, listed first and by name.
       *
       * A stack list that opens with Next.js tells someone with a plain
       * hand-written site that they are in the wrong place. Plenty of the
       * work here is exactly that, and semantic markup and real CSS are the
       * part most framework-first developers get wrong.
       */
      { name: "HTML", use: "Semantic markup, landmarks and correct document structure", url: "https://developer.mozilla.org/en-US/docs/Web/HTML" },
      { name: "CSS", use: "Cascade layers, container queries, custom properties", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" },
      { name: "JavaScript", use: "The language underneath, not just the framework", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
      { name: "Next.js", use: "App Router, server components, route handlers", url: "https://nextjs.org" },
      { name: "TypeScript", use: "Strict types from database through to UI", url: "https://www.typescriptlang.org" },
      { name: "Tailwind CSS", use: "Design tokens wired into utility classes", url: "https://tailwindcss.com" },
      { name: "React", use: "Server and client component architecture", url: "https://react.dev" },
      { name: "Framer Motion", use: "Spring physics and scroll-linked motion", url: "https://motion.dev" },
      { name: "Vite", use: "Fast dev builds for standalone React tools", url: "https://vite.dev" },
      { name: "Anime.js", use: "Timeline-sequenced SVG and logo animation", url: "https://animejs.com" },
      // No URL: a practice, not a product.
      { name: "Responsive design", use: "Fluid type and layout from 320px up" },
    ],
  },
  {
    heading: "Backend and data",
    items: [
      { name: "Convex", use: "Realtime database and backend functions", url: "https://convex.dev" },
      { name: "Supabase", use: "Postgres with row-level security and auth", url: "https://supabase.com" },
      { name: "Stripe", use: "Checkout, subscriptions, webhook reconciliation", url: "https://stripe.com" },
      { name: "Resend", use: "Transactional email and broadcast campaigns", url: "https://resend.com" },
      { name: "Google Cloud", use: "Storage buckets and scheduled jobs", url: "https://cloud.google.com" },
    ],
  },
  {
    heading: "AI",
    items: [
      { name: "Claude Code", use: "Agentic refactors across a whole codebase", url: "https://claude.com/claude-code" },
      { name: "Cursor", use: "Inline completions and multi-file edits", url: "https://cursor.com" },
      { name: "Conductor", use: "Parallel agent runs in isolated worktrees", url: "https://conductor.build" },
      { name: "Groq", use: "Low-latency inference for the site's AI agent", url: "https://groq.com" },
    ],
  },
  {
    heading: "Mobile",
    items: [
      { name: "Swift", use: "Native iOS screens and SwiftUI components", url: "https://www.swift.org" },
    ],
  },
  {
    heading: "Ship and deploy",
    items: [
      { name: "Vercel", use: "Preview deploys and edge runtime hosting", url: "https://vercel.com" },
      { name: "Netlify", use: "Static hosting with branch-based previews", url: "https://www.netlify.com" },
      { name: "GitHub", use: "Version control, PR review, Actions CI", url: "https://github.com" },
    ],
  },
  {
    heading: "Growth",
    items: [
      { name: "Google SEO", use: "Structured data, Core Web Vitals, indexing", url: "https://developers.google.com/search/docs" },
    ],
  },
];

/** Flat list of every skill name, for the marquee. */
export const ALL_SKILL_NAMES: string[] = SKILL_GROUPS.flatMap((group) =>
  group.items.map((item) => item.name),
);

/**
 * Skill name → its official URL, for anywhere a name appears without the full
 * Skill object — the ticker, for one.
 *
 * Built from SKILL_GROUPS rather than maintained separately, so a URL added to
 * a skill is immediately linkable everywhere and the two can never disagree.
 */
export const SKILL_URLS: Record<string, string> = Object.fromEntries(
  SKILL_GROUPS.flatMap((group) =>
    group.items
      .filter((item): item is Skill & { url: string } => Boolean(item.url))
      .map((item) => [item.name, item.url]),
  ),
);
