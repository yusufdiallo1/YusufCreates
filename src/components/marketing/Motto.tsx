"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * The motto, typed in three beats.
 *
 * Not the Typewriter component. That types one string at one rate; this needs
 * the three clauses to land separately — came, saw, conquered — with a beat
 * between them, because the line's whole rhythm is the tricolon. Typed as a
 * single string it reads as one long word.
 *
 * The translation follows once the Latin is finished, quieter and untyped: a
 * second typed line in a row is a gimmick, and this one is a gloss rather
 * than a statement.
 *
 * Layout is reserved up front — the finished text is always in the DOM at
 * full size, with the animated copy laid over it — so nothing below shifts
 * while it plays. Screen readers get the whole line at once; the animation is
 * aria-hidden, since a region updating per character interrupts itself.
 */

/** The three clauses, kept apart so each can arrive on its own. */
const CLAUSES = ["Veni,", "vidi,", "vici."];
const TRANSLATION = "I came, I saw, I conquered.";

const CHAR_MS = 70;
/** The pause between clauses. Longer than a character, or there is no comma. */
const BEAT_MS = 260;

export function Motto({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const [started, setStarted] = useState(false);
  /** How many characters of the joined Latin have been typed. */
  const [typed, setTyped] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);

  const full = CLAUSES.join(" ");

  // Starts when it is actually looked at. A motto that has already finished
  // by the time you scroll to it may as well be static text.
  useEffect(() => {
    const node = ref.current;
    if (!node || reduceMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      // No negative inset: an element that only peeks into the fold must
      // still trigger, or it sits invisible until something scrolls.
      { rootMargin: "0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (!started || reduceMotion) return;
    if (typed >= full.length) {
      const id = setTimeout(() => setShowTranslation(true), 420);
      return () => clearTimeout(id);
    }

    /*
     * A longer pause on the character that ends a clause.
     *
     * The delay is chosen by looking at what was just typed rather than by
     * tracking which clause we are in — the string already knows where the
     * commas are, and reading them back needs no second piece of state.
     */
    const justTyped = full[typed - 1];
    const atBreak = justTyped === "," || justTyped === " ";

    const id = setTimeout(
      () => setTyped((n) => n + 1),
      atBreak ? BEAT_MS : CHAR_MS,
    );
    return () => clearTimeout(id);
  }, [started, typed, full, reduceMotion]);

  // Reduced motion gets the finished thing, no cursor, no staging.
  const done = reduceMotion || typed >= full.length;

  return (
    <div ref={ref} className={className}>
      {/* The accessible copy: the whole motto and its meaning, read once. */}
      <p className="sr-only">
        {full} — {TRANSLATION}
      </p>

      <div aria-hidden="true">
        {/*
          Sized by the finished string underneath, with the typed copy laid
          over it. Without this the line grows as it types and drags the
          paragraph below it down the page character by character.
        */}
        <p className="relative text-2xl leading-snug text-primary italic">
          <span className="invisible">{full}</span>
          <span className="absolute inset-0">
            {reduceMotion ? full : full.slice(0, typed)}
            {!done ? (
              <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-[color:var(--accent)] align-middle [height:1em]" />
            ) : null}
          </span>
        </p>

        <p
          className={`mt-3 text-sm text-secondary transition-opacity duration-700 ${
            reduceMotion || showTranslation ? "opacity-100" : "opacity-0"
          }`}
        >
          {TRANSLATION}
        </p>
      </div>
    </div>
  );
}
