export const SITE = {
  name: "YusufCreates",
  // Also the share-card and search-result copy, so it says what the work is
  // rather than three verbs that could describe anyone.
  description:
    "Websites and web apps for founders and teams who need it to work, not just look finished. Next.js, TypeScript and Convex.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const MARKETING_NAV = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
] as const;

/** The one social account linked from the site. */
export const INSTAGRAM = {
  handle: "@yusufcreatesdev",
  href: "https://www.instagram.com/yusufcreatesdev/",
} as const;
