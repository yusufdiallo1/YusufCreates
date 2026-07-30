export const SITE = {
  name: "YusufCreates",
  // Also the share-card and search-result copy, so it says what the work is
  // rather than three verbs that could describe anyone.
  description:
    "Websites and web apps for founders and teams who need it to work, not just look finished. Next.js, TypeScript and Convex.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

/**
 * Where the back office lives.
 *
 * One constant, because the path appears in the middleware matcher, the
 * sidebar, the command palette and every internal link — and a rename that
 * updates some of those and not others produces dead links that only show up
 * when you click them.
 *
 * The obscure name is worth being honest about: it is not a security control.
 * The path ships in the client bundle and anyone reading page source finds it.
 * What actually protects the admin is the middleware gate plus requireAdmin
 * re-checking every Convex call and failing closed. This only keeps it out of
 * casual reach.
 */
export const ADMIN_PATH = "/admin-yusuf-creates-secure";

export const MARKETING_NAV = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
] as const;

/** The one social account linked from the site. */
export const INSTAGRAM = {
  handle: "@yusufcreatesdev",
  href: "https://www.instagram.com/yusufcreatesdev/",
} as const;
