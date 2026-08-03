"use client";

import { cn } from "@/lib/utils";

/**
 * GlassSkeleton — a placeholder in the same material as everything else.
 *
 * A grey pulsing block belongs to a different design language, and dropping
 * one into a glass interface says the loading state was an afterthought. This
 * is a glass panel with a faster version of the specular sweep the Enterprise
 * band uses, so waiting looks like part of the site.
 *
 * DIMENSIONS MUST MATCH THE FINAL CONTENT. A skeleton that shifts layout when
 * it resolves is worse than no skeleton — it converts a wait into a jump, and
 * the jump is what people actually notice. Pass explicit sizes.
 *
 * No spinners anywhere on the marketing site: a spinner is an admission that
 * you do not know how long something will take.
 */

export interface GlassSkeletonProps {
  className?: string;
  /** Match the real content's height exactly. */
  height?: number | string;
  width?: number | string;
  rounded?: "sm" | "md" | "lg" | "full";
}

const RADIUS = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  full: "var(--radius-full)",
} as const;

export function GlassSkeleton({
  className,
  height,
  width,
  rounded = "md",
}: GlassSkeletonProps) {
  return (
    <div
      // Announced as busy rather than as empty content.
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("glass-skeleton", className)}
      style={{ height, width, borderRadius: RADIUS[rounded] }}
    >
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** A run of text lines. The last is short, as a real paragraph's would be. */
export function GlassSkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <GlassSkeleton
          key={i}
          height={12}
          width={i === lines - 1 ? "62%" : "100%"}
          rounded="sm"
        />
      ))}
    </div>
  );
}
