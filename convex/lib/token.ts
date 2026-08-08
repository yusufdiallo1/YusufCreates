/**
 * Unguessable tokens for links sent by email.
 *
 * Extracted because the same sixteen-byte generator had been written out
 * three separate times — in proposals, subscribers and express — and a
 * security primitive that exists in three places is a security primitive
 * that will eventually differ in three places.
 *
 * 16 bytes of CSPRNG, hex encoded: 32 characters, 128 bits. `crypto` here is
 * the Web Crypto global, which Convex's runtime provides; `Math.random` is
 * not a CSPRNG and must never be used for anything reachable by URL.
 *
 * These tokens ARE the credential on the page they unlock. Every route that
 * accepts one must be noindex/nocache, and must 404 rather than error on a
 * miss so nothing confirms to a guesser that they were close.
 */
export function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
