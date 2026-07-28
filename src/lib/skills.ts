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
}

export interface SkillGroup {
  heading: string;
  items: Skill[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    heading: "Frontend",
    items: [
      { name: "Next.js", use: "App Router, server components, route handlers" },
      { name: "TypeScript", use: "Strict types from database through to UI" },
      { name: "Tailwind CSS", use: "Design tokens wired into utility classes" },
      { name: "React", use: "Server and client component architecture" },
      { name: "Framer Motion", use: "Spring physics and scroll-linked motion" },
      { name: "Vite", use: "Fast dev builds for standalone React tools" },
      { name: "Anime.js", use: "Timeline-sequenced SVG and logo animation" },
      { name: "Responsive design", use: "Fluid type and layout from 320px up" },
    ],
  },
  {
    heading: "Backend and data",
    items: [
      { name: "Convex", use: "Realtime database and backend functions" },
      { name: "Supabase", use: "Postgres with row-level security and auth" },
      { name: "Stripe", use: "Checkout, subscriptions, webhook reconciliation" },
      { name: "Resend", use: "Transactional email and broadcast campaigns" },
      { name: "Google Cloud", use: "Storage buckets and scheduled jobs" },
    ],
  },
  {
    heading: "AI",
    items: [
      { name: "Claude Code", use: "Agentic refactors across a whole codebase" },
      { name: "Cursor", use: "Inline completions and multi-file edits" },
      { name: "Conductor", use: "Parallel agent runs in isolated worktrees" },
      { name: "Groq", use: "Low-latency inference for the site's AI agent" },
    ],
  },
  {
    heading: "Mobile",
    items: [{ name: "Swift", use: "Native iOS screens and SwiftUI components" }],
  },
  {
    heading: "Ship and deploy",
    items: [
      { name: "Vercel", use: "Preview deploys and edge runtime hosting" },
      { name: "Netlify", use: "Static hosting with branch-based previews" },
      { name: "GitHub", use: "Version control, PR review, Actions CI" },
    ],
  },
  {
    heading: "Growth",
    items: [
      { name: "Google SEO", use: "Structured data, Core Web Vitals, indexing" },
    ],
  },
];

/** Flat list of every skill name, for the marquee. */
export const ALL_SKILL_NAMES: string[] = SKILL_GROUPS.flatMap((group) =>
  group.items.map((item) => item.name),
);
