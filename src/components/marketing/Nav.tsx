"use client";

import { useEffect, useRef, useState } from "react";
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
  // Set when pointerdown has already toggled the menu, so the click that
  // follows on a mouse does not toggle it straight back.
  const pointerHandled = useRef(false);

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
  //
  // The flag on <html> is how anything else fixed to the viewport knows to get
  // out of the way — the chat pill sits at the same stacking level as this
  // overlay, so without it the pill stayed on top of the open menu and swallowed
  // taps meant for the nav. A data attribute rather than a context because the
  // two live in different trees and only CSS needs to know.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.navOpen = "true";
    return () => {
      document.body.style.overflow = previous;
      delete document.documentElement.dataset.navOpen;
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

              But preventDefault on pointerdown also suppresses the click the
              browser would synthesise, and Enter/Space on a <button> arrive
              as a click with no pointer event before them — so handling only
              pointerdown made the menu unreachable by keyboard entirely.

              Both are handled, and the ref guards against the pair firing for
              one activation: a mouse produces pointerdown AND click, which
              would otherwise toggle twice and leave the menu shut.

              The target is 44px with touch-manipulation, which also removes
              the 300ms double-tap delay some mobile browsers still apply.
            */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                pointerHandled.current = true;
                setOpen((v) => !v);
              }}
              onClick={() => {
                // Already toggled on contact; this is the click that followed.
                if (pointerHandled.current) {
                  pointerHandled.current = false;
                  return;
                }
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
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            /* Opening reads as a movement, not a cut. Closing stays quicker
               than opening — waiting on a panel you have already dismissed
               feels like lag, where the same duration on the way in reads as
               considered. */
            transition={{
              duration: reduceMotion ? 0.12 : 0.42,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed inset-0 z-40 flex flex-col bg-canvas px-6 pt-28 pb-10 md:hidden"
          >
            <ul className="flex flex-col gap-2">
              {NAV_ITEMS.map((item, index) => (
                <motion.li
                  key={item.href}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  /* Staggered with the panel, not after it: the last item
                     lands around the time the panel settles, so the whole
                     thing reads as one movement rather than a list catching
                     up with its own container. */
                  transition={{
                    duration: reduceMotion ? 0.12 : 0.4,
                    delay: reduceMotion ? 0 : 0.08 + index * 0.055,
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
