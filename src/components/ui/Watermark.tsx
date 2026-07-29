import { Logo } from "@/components/ui/Logo";

/**
 * The mark, sitting quietly on every page.
 *
 * Fixed to the bottom-left and very low contrast — present if you look for it,
 * invisible if you are reading. A watermark that competes with the content is
 * a watermark someone asks you to remove.
 *
 * Bottom-LEFT deliberately: the chat pill, the cookie notice and the referral
 * panel all live bottom-right, and stacking a fifth thing there would cover
 * something people need to tap.
 *
 * pointer-events-none so it can never intercept a click, aria-hidden because
 * the site is already named in the nav and the footer — a screen reader
 * announcing the logo a third time is noise.
 */
export function Watermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-5 left-5 z-10 hidden opacity-[0.07] transition-opacity duration-slow select-none sm:block"
    >
      <Logo variant="mark" className="h-8 w-auto" />
    </div>
  );
}
