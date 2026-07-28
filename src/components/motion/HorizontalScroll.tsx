"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

/**
 * HorizontalScroll — a wide row that translates sideways while a tall outer
 * container scrolls past.
 *
 * The travel distance is measured from the real content width rather than
 * guessed, and recalculated on resize, so the row always ends flush with the
 * right edge instead of stopping short or overshooting.
 *
 * Mobile and reduced motion get an ordinary horizontally scrollable row. A
 * pinned horizontal section on a phone fights the only gesture the user has,
 * and it traps keyboard focus in a container that cannot be escaped.
 */

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function HorizontalScroll({
  children,
  className,
}: HorizontalScrollProps) {
  const reduceMotion = useReducedMotion();
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const measure = () => {
      const el = track.current;
      if (!el) return;
      // How far the row must move for its right edge to reach the viewport's.
      setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isDesktop, children]);

  const { scrollYProgress } = useScroll({
    target: outer,
    offset: ["start start", "end end"],
  });

  const rawX = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const x = useSpring(rawX, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const active = isDesktop && !reduceMotion && distance > 0;

  // Resting state: a normal scrollable row, fully keyboard reachable.
  if (!active) {
    return (
      <div
        className={className}
        style={{ display: "flex", gap: "1.5rem", overflowX: "auto" }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={outer}
      className={className}
      // Extra viewport height gives the row room to travel.
      style={{ height: `${distance + window.innerHeight}px` }}
    >
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <motion.div
          ref={track}
          style={{ x, display: "flex", gap: "1.5rem", willChange: "transform" }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
