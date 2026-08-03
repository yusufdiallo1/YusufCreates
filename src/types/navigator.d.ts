/**
 * Ambient declarations for Navigator APIs that ship in browsers but are absent
 * from TypeScript's lib.dom.d.ts.
 *
 * `hardwareConcurrency` is already declared by lib.dom. These two are not:
 *
 *   - deviceMemory is a Device Memory API draft, implemented in Chromium only.
 *   - NetworkInformation is a Network Information API draft, likewise.
 *
 * Both are optional here rather than required, because declaring them
 * non-optional would let `strict` code read them on Safari and Firefox — where
 * they are genuinely undefined — without a guard. Every call site must default.
 */

interface NetworkInformation {
  /** Round-trip-estimated bucket. "slow-2g" is a real value; do not omit it. */
  readonly effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  /** User has asked for reduced data use. A stated preference, like reduced-motion. */
  readonly saveData?: boolean;
}

interface Navigator {
  /**
   * Approximate device RAM in GiB. Spec-capped at 8 and rounded to a power of
   * two, so the only meaningful readings are 0.25 through 8 — never treat it as
   * a precise figure.
   */
  readonly deviceMemory?: number;
  readonly connection?: NetworkInformation;
}
