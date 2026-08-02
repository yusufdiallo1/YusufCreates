"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * TextReveal — splits text into word or letter spans and staggers them in.
 *
 * The visible text is always the original string, and each fragment carries
 * aria-hidden with a single readable copy alongside, so screen readers never
 * hear text spelled out one letter at a time.
 */

interface TextRevealProps {
  children: string;
  /** Split granularity. Letters are heavier — reserve them for short headings. */
  by?: "word" | "letter";
  /** Seconds before the first fragment animates. */
  delay?: number;
  /** Seconds between fragments. */
  stagger?: number;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  /**
   * Animate on mount instead of on scroll into view.
   *
   * Required for anything above the fold. `whileInView` on a hero is already
   * satisfied the instant it is observed, so it snaps to the finished state
   * with no visible transition — which is why the hero headline looked static.
   */
  onMount?: boolean;
}

export function TextReveal({
  children,
  by = "word",
  delay = 0,
  stagger = by === "letter" ? 0.018 : 0.05,
  className,
  as: Tag = "span",
  onMount = false,
}: TextRevealProps) {
  const reduceMotion = useReducedMotion();

  const fragments =
    by === "letter" ? Array.from(children) : children.split(/(\s+)/);

  return (
    <Tag className={className}>
      {/* One readable copy for assistive tech. */}
      <span className="sr-only">{children}</span>

      <span aria-hidden="true">
        {fragments.map((fragment, index) => {
          // Preserve whitespace runs without animating them.
          if (/^\s+$/.test(fragment)) return fragment;

          return (
            <span
              key={`${fragment}-${index}`}
              // inline-block is required for transform to apply to inline text,
              // and the wrapper clips the rise so glyphs slide out from behind.
              style={{ display: "inline-block", overflow: "hidden" }}
            >
              {/* No explicit will-change: this renders one span per word, so
                  declaring it would pin a GPU layer per word for the life of
                  the page. Motion applies and releases it around the animation
                  itself, which is the correct lifetime. */}
              <motion.span
                style={{ display: "inline-block" }}
                /*
                 * Reduced motion keeps this component mounted and simply
                 * renders at rest. Returning a plain string instead changed
                 * the element tree between the server and the client, which
                 * failed hydration and re-rendered the whole page.
                 */
                initial={reduceMotion ? false : { y: "100%", opacity: 0 }}
                {...(onMount
                  ? { animate: { y: 0, opacity: 1 } }
                  : {
                      whileInView: { y: 0, opacity: 1 },
                      viewport: { once: true, margin: "-40px", amount: "some" },
                    })}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.6,
                        delay: delay + index * stagger,
                        ease: [0.16, 1, 0.3, 1],
                      }
                }
              >
                {fragment}
              </motion.span>
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
