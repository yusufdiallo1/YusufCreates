"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useCapability } from "@/components/providers/CapabilityProvider";

/**
 * ProcessConnector — a line that draws itself through the process steps.
 *
 * The path is routed only at 45 and 90 degrees, matching the logo geometry, so
 * it reads as part of the mark's language rather than as a generic swoosh. A
 * small dot travels the drawing head, and each step's node fills as the line
 * reaches it.
 *
 * The path is MEASURED, not hardcoded. Step positions depend on the grid,
 * which changes at every breakpoint and again when a step's text wraps to
 * another line — a fixed path would be right at one width and wrong
 * everywhere else. A ResizeObserver on the container recomputes it, rather
 * than a window listener, because the container can change size while the
 * window does not.
 */

export interface ProcessConnectorProps {
  /** Selector for the step anchors, relative to the container. */
  stepSelector?: string;
  className?: string;
}

export function ProcessConnector({
  stepSelector = "[data-process-step]",
  className,
}: ProcessConnectorProps) {
  const container = useRef<HTMLDivElement>(null);
  const { tier } = useCapability();
  const [path, setPath] = useState<string>("");
  const [box, setBox] = useState({ w: 0, h: 0 });

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start 0.8", "end 0.4"],
  });

  // Motion normalises pathLength to 0..1 regardless of the real path length,
  // so this works without measuring the geometry.
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const dotProgress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const measure = () => {
      const parent = root.parentElement;
      if (!parent) return;

      const steps = Array.from(
        parent.querySelectorAll<HTMLElement>(stepSelector),
      );
      if (steps.length < 2) {
        setPath("");
        return;
      }

      const base = parent.getBoundingClientRect();
      setBox({ w: base.width, h: base.height });

      // Anchor at the top-centre of each step's marker.
      const points = steps.map((step) => {
        const r = step.getBoundingClientRect();
        return {
          x: r.left - base.left + r.width / 2,
          y: r.top - base.top,
        };
      });

      /*
       * Orthogonal routing at 45 and 90 degrees only, matching the logo.
       *
       * Three cases, and the flat one matters most: on a wide screen all four
       * steps sit on the same row, so a generic "out, across, in" router
       * inserts a rise and a fall that go nowhere. Steps level with each other
       * get a straight line, and only a real change of row gets a dogleg.
       */
      const CHAMFER = 12;
      const LEVEL = 2; // px tolerance for "same row"
      let d = `M ${points[0]!.x} ${points[0]!.y}`;

      for (let i = 1; i < points.length; i++) {
        const from = points[i - 1]!;
        const to = points[i]!;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dirX = Math.sign(dx) || 1;
        const dirY = Math.sign(dy) || 1;

        // Same row: straight across. Same column: straight down.
        if (Math.abs(dy) <= LEVEL) {
          d += ` L ${to.x} ${from.y}`;
          continue;
        }
        if (Math.abs(dx) <= LEVEL) {
          d += ` L ${from.x} ${to.y}`;
          continue;
        }

        // Wrapping to the next row: down, chamfer, across, chamfer, down.
        const midY = from.y + dy / 2;
        d +=
          ` L ${from.x} ${midY - dirY * CHAMFER}` +
          ` L ${from.x + dirX * CHAMFER} ${midY}` +
          ` L ${to.x - dirX * CHAMFER} ${midY}` +
          ` L ${to.x} ${midY + dirY * CHAMFER}` +
          ` L ${to.x} ${to.y}`;
      }

      setPath(d);
    };

    measure();

    // The container, not the window: a step's text can rewrap and change the
    // layout at a width the window never reports changing.
    const observer = new ResizeObserver(measure);
    const parent = root.parentElement;
    if (parent) observer.observe(parent);
    return () => observer.disconnect();
  }, [stepSelector]);

  // Minimal: no line. It is decoration, and the numbered steps carry the
  // sequence on their own.
  if (tier === "minimal") return null;

  const animated = tier === "full";

  return (
    <div
      ref={container}
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      {path && box.w > 0 ? (
        <svg
          width={box.w}
          height={box.h}
          viewBox={`0 0 ${box.w} ${box.h}`}
          fill="none"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {/* The track the line will draw over. */}
          <path
            d={path}
            stroke="var(--border-hairline)"
            strokeWidth={1}
            fill="none"
          />

          <motion.path
            d={path}
            stroke="var(--dev-cyan)"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
            style={animated ? { pathLength } : { pathLength: 1 }}
            opacity={0.7}
          />

          {animated ? (
            <motion.circle
              r={3}
              fill="var(--dev-cyan)"
              style={{
                offsetPath: `path("${path}")`,
                offsetDistance: dotProgress,
                offsetRotate: "0deg",
              }}
            />
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
