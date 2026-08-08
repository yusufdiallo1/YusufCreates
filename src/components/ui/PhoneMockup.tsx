import Image from "next/image";

/**
 * PhoneMockup — a screenshot in a phone frame.
 *
 * The frame is CSS rather than a PNG overlay. A frame image would have to be
 * fetched, would carry its own colour that fights the theme, and would need a
 * second asset for light mode; three nested rounded boxes cost nothing and
 * follow --canvas on their own.
 *
 * ASPECT IS THE SCREENSHOT'S, not a nominal device ratio. The three product
 * shots are 739×1622 and thereabouts — within half a per cent of each other
 * but none of them exactly 19.5:9. Sizing the screen to a real device ratio
 * and cropping to fit would shave a strip off a UI screenshot, which is where
 * the status bar and the tab bar live. The frame bends to the image.
 *
 * Height-capped rather than width-driven: this sits in a pinned panel that
 * must not exceed the viewport, and a phone is tall enough that deriving its
 * height from a column width overflows on anything but a large screen.
 */

/** The screenshots' own ratio. See the note above about not rounding this. */
const SCREEN_ASPECT = "739 / 1622";

export function PhoneMockup({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 rounded-[2.75rem] bg-[#0b0b0d] p-[3px] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 ${className}`}
      style={{ aspectRatio: SCREEN_ASPECT, height: "min(68dvh, 620px)" }}
    >
      {/* The screen. overflow-hidden here rather than on the frame so the
          bezel's own ring is not clipped by its child. */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[2.55rem] bg-black"
        style={{ aspectRatio: SCREEN_ASPECT }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          /* Never more than about a third of a wide viewport, and it is
             height-capped besides — asking for 100vw would fetch an image
             several times the size it is ever painted at. */
          sizes="(max-width: 1024px) 70vw, 32vw"
          className="object-cover object-top"
          priority={priority}
        />

        {/* Dynamic island. aria-hidden and non-interactive: it is a drawing of
            hardware, not content, and a screen reader announcing it would be
            announcing the frame rather than the work. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[0.9%] left-1/2 h-[2.1%] w-[26%] -translate-x-1/2 rounded-full bg-black"
        />
      </div>
    </div>
  );
}
