import Link from "next/link";
import { InstagramIcon } from "@/components/ui/SocialIcons";
import { Logo } from "@/components/ui/Logo";
import { CopyButton } from "@/components/ui/CopyButton";
import { INSTAGRAM } from "@/lib/constants";
import { NewsletterForm } from "@/components/marketing/NewsletterForm";
import { ShareWithFriendLink } from "@/components/marketing/ShareWithFriend";
import { FeedbackModal } from "@/components/marketing/FeedbackModal";
import { AvailabilityBadge } from "@/components/marketing/AvailabilityBadge";

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
            <div className="mt-4">
              <AvailabilityBadge />
            </div>
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
              <div className="space-y-1.5">
                <Link
                  href="/pricing"
                  className="block text-sm text-accent transition-colors duration-fast hover:text-primary"
                >
                  Start a project
                </Link>
                {/* The lead magnet. Footer rather than nav — six top-level
                    items is already the limit before a nav starts to read as
                    a list. */}
                <Link
                  href="/waitlist"
                  className="block text-sm text-secondary transition-colors duration-fast hover:text-primary"
                >
                  Hold a slot
                </Link>
                <Link
                  href="/audit"
                  className="block text-sm text-secondary transition-colors duration-fast hover:text-primary"
                >
                  Free site audit
                </Link>
              </div>
            </div>
          </div>

          {/* 4. Social */}
          <div>
            <h2 className="text-xs text-secondary uppercase">Elsewhere</h2>
            <a
              href={INSTAGRAM.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram, ${INSTAGRAM.handle}`}
              data-cursor="link"
              className="footer-social mt-3 -ml-2 inline-flex items-center gap-2 rounded-md px-2 py-2"
            >
              <InstagramIcon size={20} />
              <span className="text-sm">{INSTAGRAM.handle}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="hairline-t">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-10 md:grid-cols-2">
          <NewsletterForm className="relative max-w-md" />

          {/* Two links rather than an open share block. Four buttons for an
              offer most visitors are not ready to act on was taking the same
              weight as the newsletter beside it. */}
          <div className="flex flex-col items-start gap-3 md:items-end">
            <ShareWithFriendLink className="text-sm text-primary transition-colors duration-fast hover:text-accent" />
            <FeedbackModal className="text-sm text-secondary transition-colors duration-fast hover:text-primary" />
          </div>
        </div>
      </div>

      <div className="hairline-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 text-xs text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 YusufCreates</p>

          {/* Enterprise procurement looks for these, and a site collecting
              email addresses without them is a real exposure. */}
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { href: "/legal/privacy", label: "Privacy" },
              { href: "/legal/terms", label: "Terms" },
              { href: "/legal/cookies", label: "Cookies" },
              { href: "/legal/accessibility", label: "Accessibility" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors duration-fast hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
