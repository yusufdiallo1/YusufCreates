"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { cn } from "@/lib/utils";

/**
 * Nav — fixed glass pill that condenses on scroll.
 *
 * Only the wordmark sits on the left, per brand direction: no separate mark
 * competing with it at small sizes.
 *
 * Mobile is a full-screen overlay rather than a dropdown, so the tap targets
 * stay large and the page behind is fully covered.
 */

const NAV_ITEMS = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
] as const;

export function Nav() {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the overlay on navigation. Adopting the new pathname during render
  // avoids a setState in an effect body, which would cascade an extra render.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Lock the page behind the overlay, and restore on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes the overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <motion.nav
          aria-label="Main"
          animate={
            reduceMotion
              ? undefined
              : { paddingTop: condensed ? 8 : 14, paddingBottom: condensed ? 8 : 14 }
          }
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "nav-pill flex w-full max-w-3xl items-center justify-between gap-6 rounded-full px-5",
            condensed && "nav-pill-condensed",
          )}
        >
          {/* Always returns to the homepage, from any route. */}
          <Link
            href="/"
            aria-label="YusufCreates, back to home"
            className="shrink-0"
            onClick={() => setOpen(false)}
          >
            <AnimatedLogo className="h-5 w-auto sm:h-6" />
          </Link>

          <ul className="hidden items-center gap-7 md:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "text-sm transition-colors duration-fast",
                    pathname.startsWith(item.href)
                      ? "text-primary"
                      : "text-secondary hover:text-primary",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Link
              href="/start"
              className="hidden rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 sm:block"
            >
              Start a project
            </Link>

            {/*
              onPointerDown, not onClick.

              The nav animates its own padding as the page scrolls, so the
              button can move a few pixels between a touch landing and the
              click event resolving — and a click that lands on a moved target
              is silently dropped. That is why it took several taps. Pointer
              events fire on contact, before any of that can happen.

              The target is 44px with touch-manipulation, which also removes
              the 300ms double-tap delay some mobile browsers still apply.
            */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                setOpen((v) => !v);
              }}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="-mr-2 flex size-11 touch-manipulation items-center justify-center rounded-full md:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={cn(
                    "absolute left-0 block h-px w-4 bg-current transition-transform duration-fast",
                    open ? "top-1.5 rotate-45" : "top-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-px w-4 bg-current transition-transform duration-fast",
                    open ? "top-1.5 -rotate-45" : "top-3",
                  )}
                />
              </span>
            </button>
          </div>
        </motion.nav>
      </header>

      {/* Full-screen overlay on mobile.

          Deliberately NOT backdrop-blurred. A full-viewport backdrop-filter
          forces the compositor to re-snapshot and blur everything behind it on
          every frame, which is the single most expensive effect available and
          the reason this felt slow to open on a phone. An opaque canvas fill
          reads the same and costs nothing.

          AnimatePresence gives it an exit, so dismissing does not just vanish;
          only opacity and transform animate, both compositor-only. */}
      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 flex flex-col bg-canvas px-6 pt-28 pb-10 md:hidden"
          >
            <ul className="flex flex-col gap-2">
              {NAV_ITEMS.map((item, index) => (
                <motion.li
                  key={item.href}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: reduceMotion ? 0 : 0.04 + index * 0.035,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={item.href}
                    className="hairline-b block py-4 text-2xl text-primary"
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
            </ul>

            <Link
              href="/start"
              className="mt-auto rounded-full bg-primary py-3 text-center text-sm font-medium text-canvas"
            >
              Start a project
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
