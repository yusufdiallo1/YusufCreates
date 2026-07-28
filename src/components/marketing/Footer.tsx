import Link from "next/link";
import {
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
} from "@/components/ui/SocialIcons";
import { Logo } from "@/components/ui/Logo";
import { CopyButton } from "@/components/ui/CopyButton";

/**
 * Footer — four columns collapsing to one on mobile.
 *
 * Icons are Iconsax throughout the site. Mixing icon families is one of the
 * fastest ways a premium site starts to look assembled from parts, so nothing
 * here reaches for a second library.
 */

const NAV = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

const SOCIAL = [
  {
    label: "Instagram",
    href: "https://instagram.com/yusufcreates",
    Icon: InstagramIcon,
  },
  {
    label: "GitHub",
    href: "https://github.com/yusufdiallo1",
    Icon: GithubIcon,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/yusufdiallo",
    Icon: LinkedinIcon,
  },
  { label: "X", href: "https://x.com/yusufcreates", Icon: XIcon },
];

export function Footer() {
  return (
    <footer className="hairline-t mt-24">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Identity and availability */}
          <div>
            <Logo variant="mark" className="h-7 w-auto" />
            <p className="mt-4 max-w-56 text-sm text-secondary">
              Fast, considered software for people who care how it feels.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-hairline)] px-3 py-1 text-xs text-secondary">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent"
              />
              Available for new work
            </p>
          </div>

          {/* 2. Navigation */}
          <nav aria-label="Footer">
            <h2 className="text-xs text-secondary uppercase">Navigation</h2>
            <ul className="mt-4 space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-secondary transition-colors duration-fast hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 3. Contact */}
          <div>
            <h2 className="text-xs text-secondary uppercase">Contact</h2>
            <div className="mt-4 space-y-2">
              <CopyButton
                value="hello@yusufcreates.com"
                className="-ml-2 text-sm"
              >
                hello@yusufcreates.com
              </CopyButton>
              <div>
                <Link
                  href="/start"
                  className="text-sm text-accent transition-colors duration-fast hover:text-primary"
                >
                  Start a project
                </Link>
              </div>
            </div>
          </div>

          {/* 4. Social */}
          <div>
            <h2 className="text-xs text-secondary uppercase">Elsewhere</h2>
            <ul className="mt-4 flex flex-wrap gap-1">
              {SOCIAL.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="footer-social flex size-10 items-center justify-center rounded-md"
                  >
                    <Icon size={20} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="hairline-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 YusufCreates</p>
          <p>Madinah, Saudi Arabia</p>
        </div>
      </div>
    </footer>
  );
}
