"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Typewriter — types a line out when it scrolls into view.
 *
 * Not TextReveal. That fades whole words in at once from a finished layout;
 * this reveals one character at a time with a cursor following, which reads
 * as something being written rather than something arriving.
 *
 * Two things this has to get right, and both are about the text staying put:
 *
 *   1. The full string is always in the DOM, in a span that reserves its
 *      final size. Typing into an empty box reflows the page on every frame
 *      and pushes whatever is below it around for the whole animation.
 *   2. Screen readers get the complete sentence immediately. A live region
 *      that updates per character is unusable — it interrupts itself
 *      continuously — so the animated copy is aria-hidden.
 *
 * Under prefers-reduced-motion it renders the finished line with no cursor.
 */

interface TypewriterProps {
  children: string;
  /** Milliseconds per character. */
  speed?: number;
  /** Milliseconds before the first character. */
  delay?: number;
  className?: string;
  as?: "p" | "span" | "h2" | "h3" | "blockquote";
}

export function Typewriter({
  children,
  speed = 28,
  delay = 0,
  className,
  as: Tag = "p",
}: TypewriterProps) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const hostRef = useRef<HTMLElement>(null);

  // Start when it comes into view, not on mount: a line that has already
  // finished typing before it is scrolled to has not been seen.
  useEffect(() => {
    const node = hostRef.current;
    if (!node || started) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      // Slightly inside the viewport, so it does not begin while still
      // clipped at the bottom edge.
      { rootMargin: "-12% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || reduceMotion) return;
    if (count >= children.length) return;

    const timer = setTimeout(
      () => setCount((n) => n + 1),
      count === 0 ? delay : speed,
    );
    return () => clearTimeout(timer);
  }, [started, count, children.length, speed, delay, reduceMotion]);

  const done = reduceMotion || count >= children.length;

  return (
    <Tag ref={hostRef as never} className={className}>
      {/* The readable copy. Present and complete from the first paint. */}
      <span className="sr-only">{children}</span>

      {/* The animated copy. Laid out at full size with the untyped remainder
          held invisible, so nothing below it moves while this runs. */}
      <span aria-hidden="true" className="relative">
        <span>{reduceMotion ? children : children.slice(0, count)}</span>
        {!done ? (
          <>
            <span className="type-caret" />
            <span className="invisible">{children.slice(count)}</span>
          </>
        ) : null}
      </span>
    </Tag>
  );
}
