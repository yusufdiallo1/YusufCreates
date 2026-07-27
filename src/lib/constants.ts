export const SITE = {
  name: "YusufCreates",
  description: "YusufCreates — build, launch, and grow.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const MARKETING_NAV = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
] as const;

export const ADMIN_NAV = [{ href: "/dashboard", label: "Dashboard" }] as const;
