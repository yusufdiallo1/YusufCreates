import type { ClassValue } from "./types";

/**
 * Join conditional class names. Kept dependency-free; swap for
 * `clsx` + `tailwind-merge` if you need conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat(Infinity as 1)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

/** Format a minor-unit amount (e.g. cents) as currency. */
export function formatCurrency(amountInMinorUnits: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountInMinorUnits / 100);
}

/** Format a timestamp as a readable date. */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}
