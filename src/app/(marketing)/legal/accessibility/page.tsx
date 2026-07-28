import type { Metadata } from "next";

/**
 * Accessibility statement.
 *
 * Names real known gaps rather than claiming full conformance. A statement
 * that says "fully accessible" with no exceptions is not credible to anyone
 * who tests, and enterprise procurement reads these closely.
 */

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Accessibility of yusufcreates.com: WCAG 2.2 AA target, what is done, known gaps, and how to report a problem.",
};

const UPDATED = "28 July 2026";

export default function AccessibilityPage() {
  return (
    <>
      <h1>Accessibility</h1>
      <p className="legal-updated">Last updated {UPDATED}</p>

      <p>
        The target for this site is WCAG 2.2 Level AA. This page says what is
        genuinely in place, and what is not yet — a statement claiming perfect
        conformance with no exceptions would not be believable.
      </p>

      <h2>What is in place</h2>

      <ul>
        <li>
          <strong className="text-primary">Contrast.</strong> Text colours are
          verified by calculation, not by eye, including over the brightest
          part of background glows. Body text meets or exceeds 4.5:1 and most
          is far above it.
        </li>
        <li>
          <strong className="text-primary">Keyboard.</strong> Everything is
          reachable and operable by keyboard alone. Dialogs trap focus while
          open and return it where it was on close. The slide-to-confirm
          control accepts arrow keys, Enter and Space.
        </li>
        <li>
          <strong className="text-primary">Focus.</strong> A visible focus ring
          is never removed without a replacement.
        </li>
        <li>
          <strong className="text-primary">Reduced motion.</strong>{" "}
          <code>prefers-reduced-motion</code> removes the load sequence,
          parallax, drifting panels and pointer tilt, leaving a composed static
          page. The confirm gesture becomes an ordinary button press.
        </li>
        <li>
          <strong className="text-primary">Reduced transparency.</strong>{" "}
          <code>prefers-reduced-transparency</code> replaces frosted panels
          with solid surfaces.
        </li>
        <li>
          <strong className="text-primary">Increased contrast.</strong>{" "}
          <code>prefers-contrast: more</code> strengthens borders, text and
          focus rings.
        </li>
        <li>
          <strong className="text-primary">Forms.</strong> Every field has a
          real label. Errors are announced to assistive technology, tied to
          their field, and describe what to do next rather than naming a
          failure.
        </li>
        <li>
          <strong className="text-primary">Text size.</strong> Form fields
          render at 16px on touch devices, so iOS does not zoom the page when
          you focus one.
        </li>
      </ul>

      <h2>Known gaps</h2>

      <ul>
        <li>
          Some decorative project imagery has empty alt text where the
          surrounding heading already names the project. This is deliberate,
          but reasonable people disagree about it.
        </li>
        <li>
          The site has not yet been tested end-to-end with VoiceOver, NVDA and
          JAWS. Automated checks and keyboard testing have been done;
          screen-reader testing across all three is outstanding.
        </li>
        <li>
          Long slide-to-confirm labels reduce in size on very narrow screens
          (320px) and can still truncate. The fix is shorter copy, and it is on
          the list.
        </li>
      </ul>

      <h2>Reporting a problem</h2>

      <p>
        If something here does not work for you, email{" "}
        <a href="mailto:hello@yusufcreates.com">hello@yusufcreates.com</a> and
        describe what happened and what you were using. I will reply within one
        working day and tell you honestly whether and when I can fix it.
      </p>

      <p>
        This matters to me beyond compliance: an interface that excludes people
        is a badly built interface.
      </p>
    </>
  );
}
