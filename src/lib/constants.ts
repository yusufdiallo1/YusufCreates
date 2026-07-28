export const SITE = {
  name: "YusufCreates",
  description: "YusufCreates — build, launch, and grow.",
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
