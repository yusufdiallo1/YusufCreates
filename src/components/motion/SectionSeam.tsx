import { cn } from "@/lib/utils";

/**
 * SectionSeam — the hairline between two marketing sections.
 *
 * Transparent at both ends and brightest in the middle, so it reads as a join
 * in one continuous surface rather than as a rule ending abruptly at the
 * gutters. It brightens as it comes into view and settles back once it is
 * properly on screen.
 *
 * NO JAVASCRIPT. The brightening runs on a native `animation-timeline: view()`
 * — see .section-seam in glass-effects.css and seam-brighten in
 * scroll-animations.css. This is precisely what that API is for: it is driven
 * by the compositor, costs nothing, and keeps running while the main thread is
 * busy. An IntersectionObserver here would be a worse version of something the
 * browser already does.
 *
 * Where view() is unsupported the seam simply sits at its resting alpha, which
 * is the same line without the flourish.
 *
 * A <div role="separator"> rather than an <hr>: this is decoration between two
 * sections that already have headings, and announcing a separator to a screen
 * reader between every one of them is noise. aria-hidden, no role.
 */
export function SectionSeam({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("section-seam mx-auto max-w-6xl", className)}
    />
  );
}
