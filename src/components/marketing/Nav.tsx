"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { Magnetic } from "@/components/motion/Magnetic";
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

/** Resting width of the pill, in px. Tailwind's max-w-3xl, stated in a number
    so the overshoot can be a fraction of it rather than a second magic value. */
const PILL_WIDTH = 768;

export function Nav() {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);
  /** Which nav item the pointer or focus is on, for the sliding indicator. */
  const [hovered, setHovered] = useState<string | null>(null);
  // Set when pointerdown has already toggled the menu, so the click that
  // follows on a mouse does not toggle it straight back.
  const pointerHandled = useRef(false);

  /*
   * The expand overshoot.
   *
   * maxWidth rather than scaleX: four per cent of scale is small on a box and
   * very visible on the type inside it, and a wordmark that stretches every
   * time you scroll up is worse than no overshoot at all.
   *
   * Out fast and back on a spring — the settle is the part that reads as
   * responsiveness.
   */
  const overshoot = useMotionValue(0);
  const pillMaxWidth = useTransform(
    overshoot,
    [0, 1],
    [PILL_WIDTH, PILL_WIDTH * 1.04],
  );
  /** Blocks a re-trigger until the current overshoot has been and come back. */
  const expandingUntil = useRef(0);

  /*
   * Scroll POSITION decides the condensed state; scroll DIRECTION decides
   * whether the pill overshoots on the way back out.
   *
   * Scrolling up after having been condensed is intent — you are going back
   * for something, and the nav is usually where it is. Letting it pass its
   * resting width by a few per cent and spring back makes it feel like a
   * response to that rather than to a threshold being crossed. Position alone
   * cannot tell those apart, which is why the last offset is kept.
   */
  useEffect(() => {
    let last = window.scrollY;
    let wasCondensed = last > 24;

    /*
     * ONE overshoot per gesture, not one per scroll event.
     *
     * A wheel scroll upward fires dozens of events, and the first version
     * restarted the animation on every one of them — the outward leg never
     * finished, so the spring back never started, and the pill simply stayed
     * 4% too wide until the next reload. The guard is on time rather than on
     * the animation's own state because the return leg is what has to be
     * allowed to finish.
     *
     * Driven straight from here rather than through React state: this fires
     * per scroll event, and a setState per event would re-render a nav that
     * carries a `layout` animation, which re-measures its box on every render.
     */
    const expand = () => {
      if (reduceMotion) return;
      const now = performance.now();
      if (now < expandingUntil.current) return;
      expandingUntil.current = now + 700;

      animate(overshoot, 1, {
        duration: 0.16,
        ease: "easeOut",
        onComplete: () => {
          animate(overshoot, 0, {
            type: "spring",
            stiffness: 300,
            damping: 22,
          });
        },
      });
    };

    const onScroll = () => {
      const y = window.scrollY;
      const nowCondensed = y > 24;
      if (wasCondensed && y < last - 2) expand();
      wasCondensed = nowCondensed;
      last = y;
      // React bails out when the value is unchanged, so this is a no-op on
      // all but the two scroll events that actually cross the threshold.
      setCondensed(nowCondensed);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduceMotion, overshoot]);

  /*
   * Which item the indicator rests on when nothing is hovered.
   *
   * `startsWith` rather than an exact match, so /blog/some-post still marks
   * Blog. null on a route that is in none of them — the homepage, /start,
   * /express — where the indicator correctly shows nothing rather than
   * defaulting to the first item.
   */
  const activeHref =
    NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.href ?? null;

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
      <header
        /* Named so the view-transition rules can hold it still. Without a
           name the fixed nav is snapshotted with the outgoing page and
           cross-faded against the incoming one, which flickers on every
           navigation. See ::view-transition-group(site-nav). */
        style={{ viewTransitionName: "site-nav" }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
      >
        {/*
          The pill MORPHS between its two states rather than resizing.

          `layout`, not two animated numbers. Animating paddingTop and
          paddingBottom moved the right pixels but told Motion nothing about the
          box, so the corners and the width snapped between states while the
          padding eased — the glass appeared to be resized rather than to reflow.
          With `layout` the whole shape interpolates as one thing, and the
          padding is a class again, which is where padding belongs.

          `layout` on one node, not `layoutId`: layoutId is for matching two
          different elements across a mount boundary. There is one pill here and
          it never unmounts.

          borderRadius in style, and layout="position" on the two groups inside,
          so Motion applies its inverse-scale correction — without it a layout
          animation distorts the corners and the type as it interpolates.
        */}
        <motion.nav
          aria-label="Main"
          layout={!reduceMotion}
          style={{ borderRadius: 9999, maxWidth: pillMaxWidth }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "nav-pill flex w-full items-center justify-between gap-6 rounded-full px-5",
            condensed ? "nav-pill-condensed py-2" : "py-3.5",
          )}
        >
          {/* Always returns to the homepage, from any route.

              layout="position" so the wordmark is carried to its new place
              rather than being scaled with the box — a layout animation fakes
              the size change with a transform, and without the correction the
              type squashes for the length of the morph. */}
          <motion.div layout={reduceMotion ? false : "position"} className="shrink-0">
            <Link
              href="/"
              aria-label="YusufCreates, back to home"
              onClick={() => setOpen(false)}
            >
              <AnimatedLogo className="h-5 w-auto sm:h-6" />
            </Link>
          </motion.div>

          {/*
            The indicator physically slides between items rather than fading
            out here and in there. One element with a shared layoutId is what
            produces that: Motion sees the same node in a new place and animates
            the gap. Fading two separate markers reads as two things blinking;
            this reads as one thing moving.

            It RESTS on the active route and travels on hover, returning there
            when the pointer leaves. Previously it existed only while hovering
            and the current route carried a separate static hairline, which
            meant the one element that could have shown you where you were and
            where you are pointing was instead two elements that never met.

            A surface fill under the label as well as the accent line: a single
            hairline is the right weight for a hover hint and too quiet to say
            "you are here" from across the pill.
          */}
          <motion.ul
            layout={reduceMotion ? false : "position"}
            className="hidden items-center gap-7 md:flex"
            onPointerLeave={() => setHovered(null)}
          >
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              const marked = (hovered ?? activeHref) === item.href;
              return (
                <li key={item.href} className="relative">
                  {marked && !reduceMotion ? (
                    <motion.span
                      layoutId="nav-indicator"
                      aria-hidden="true"
                      className="absolute -inset-x-3 -inset-y-1 -z-10 rounded-full"
                      style={{
                        background: "var(--bg-surface-2)",
                        boxShadow: "inset 0 -1px 0 0 var(--accent)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  ) : null}

                  {/* Reduced motion gets the same information without the
                      travel — the marker simply appears where it belongs. */}
                  {marked && reduceMotion ? (
                    <span
                      aria-hidden="true"
                      className="absolute -inset-x-3 -inset-y-1 -z-10 rounded-full bg-surface-2"
                    />
                  ) : null}

                  <Link
                    href={item.href}
                    onPointerEnter={() => setHovered(item.href)}
                    onFocus={() => setHovered(item.href)}
                    className={cn(
                      "relative block py-1 text-sm transition-colors duration-hover ease-hover",
                      active || marked
                        ? "text-primary"
                        : "text-secondary hover:text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </motion.ul>

          <motion.div
            layout={reduceMotion ? false : "position"}
            className="flex items-center gap-2"
          >
            <Magnetic className="hidden sm:inline-flex">
              <Link
                href="/pricing"
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
              >
                Start a project
              </Link>
            </Magnetic>

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
                    "absolute left-0 block h-px w-4 bg-current transition-transform duration-hover ease-hover",
                    open ? "top-1.5 rotate-45" : "top-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-px w-4 bg-current transition-transform duration-hover ease-hover",
                    open ? "top-1.5 -rotate-45" : "top-3",
                  )}
                />
              </span>
            </button>
          </motion.div>
        </motion.nav>
      </header>

      {/* Mobile menu: a blurred scrim you can tap, and the panel over it.

          The blur is on the SCRIM, which is a plain fixed layer with nothing
          animating on it, rather than on the moving panel. A backdrop-filter
          on an element that is also being transformed re-snapshots and
          re-blurs on every frame — the expensive case, and why this was
          previously written without any blur at all. Static, it is composited
          once and costs effectively nothing while the panel slides.

          The scrim is also what makes tapping outside dismiss the menu. */}
      <AnimatePresence>
        {open ? (
          <>
            {/* Tap anywhere off the panel to dismiss. aria-hidden because the
                Escape handler and the close button already give keyboard and
                screen-reader users a way out — this is a pointer affordance. */}
            <motion.div
              key="scrim"
              aria-hidden="true"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.45 }}
              className="fixed inset-0 z-40 bg-[color:var(--canvas)]/55 backdrop-blur-xl md:hidden"
            />
          <motion.div
            id="mobile-nav"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
            /* Slower than it was on both ends. It opened in 0.42s and shut
               abruptly, which read as a cut rather than a movement; the exit
               now matches the entrance closely enough that dismissing feels
               like the same gesture reversed. */
            transition={{
              duration: reduceMotion ? 0.12 : 0.62,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed inset-0 z-40 flex flex-col bg-[color:var(--canvas)]/80 px-6 pt-28 pb-10 backdrop-blur-2xl md:hidden"
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
                    duration: reduceMotion ? 0.12 : 0.5,
                    delay: reduceMotion ? 0 : 0.1 + index * 0.07,
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
              href="/pricing"
              className="mt-auto rounded-full bg-primary py-3 text-center text-sm font-medium text-canvas"
            >
              Start a project
            </Link>
          </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
