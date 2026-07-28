"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter Variable", Inter, system-ui, sans-serif';

type LogoProps = {
  variant?: "lockup" | "mark";
  monochrome?: boolean;
  animated?: boolean;
  primaryColor?: string;
  accentColor?: string;
  className?: string;
};

const STROKE = 15;
const CHEVRON = "M61 48 L92 79 L61 110";
const ARM = "M159 48 L115 92 L115 137";
const SESSION_KEY = "yc-logo-played";

export function Logo({
  variant = "lockup",
  monochrome = false,
  animated = false,
  primaryColor = "var(--text-primary, #f7f8f8)",
  accentColor = "var(--accent, #5e6ad2)",
  className,
}: LogoProps) {
  const reduceMotion = useReducedMotion();
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (!animated || reduceMotion) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setShouldPlay(true);
  }, [animated, reduceMotion]);

  const strokeColor = monochrome ? "currentColor" : primaryColor;
  const blockColor = monochrome ? "currentColor" : accentColor;
  const yusufColor = monochrome ? "currentColor" : primaryColor;
  const createsColor = monochrome ? "currentColor" : accentColor;

  const strokeProps = {
    fill: "none",
    stroke: strokeColor,
    strokeWidth: STROKE,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };

  const mark = (
    <>
      <motion.path
        d={CHEVRON}
        {...strokeProps}
        initial={shouldPlay ? { pathLength: 0 } : false}
        animate={shouldPlay ? { pathLength: 1 } : undefined}
        transition={{ duration: 0.4, delay: 1.06, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.path
        d={ARM}
        {...strokeProps}
        initial={shouldPlay ? { pathLength: 0 } : false}
        animate={shouldPlay ? { pathLength: 1 } : undefined}
        transition={{ duration: 0.4, delay: 1.16, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.rect
        x={99}
        y={155}
        width={34}
        height={17}
        fill={blockColor}
        initial={shouldPlay ? { opacity: 1 } : false}
        animate={shouldPlay ? { opacity: [1, 0, 1, 0, 1] } : undefined}
        transition={{ duration: 1.06, times: [0, 0.25, 0.5, 0.75, 1] }}
      />
    </>
  );

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 220 220" className={className} role="img" aria-label="YusufCreates">
        <title>YusufCreates</title>
        {mark}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 56" className={className} role="img" aria-label="YusufCreates">
      <title>YusufCreates</title>
      <g transform="translate(-16.3, -4.3) scale(0.304)">{mark}</g>
      <text x={52} y={38} fontSize={28} letterSpacing="-0.022em" style={{ fontFamily: FONT_STACK }}>
        <tspan fontWeight={400} fill={yusufColor}>Yusuf</tspan>
        <tspan fontWeight={600} fill={createsColor}>Creates</tspan>
      </text>
    </svg>
  );
}
