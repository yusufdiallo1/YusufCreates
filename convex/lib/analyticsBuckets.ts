/**
 * Shared bucketing for analytics dimensions.
 *
 * Lives here because BOTH the nightly rollup and the live "today" path have
 * to agree on what a bucket means. They were written separately and drifted
 * immediately: the rollup bucketed viewport widths and the live path did not,
 * so a day with real traffic reported "No viewport data" until midnight and
 * then suddenly had it.
 *
 * Any dimension computed on both sides belongs in this file.
 */

/**
 * Viewport width to a named range.
 *
 * The boundaries are the site's own breakpoints, not round numbers, so the
 * answer to "which breakpoints actually matter" is expressed in the same
 * terms as the CSS that would change because of it.
 */
export function viewportBucket(width: number): string {
  if (width < 480) return "<480";
  if (width < 768) return "480-767";
  if (width < 1024) return "768-1023";
  if (width < 1440) return "1024-1439";
  return "1440+";
}
