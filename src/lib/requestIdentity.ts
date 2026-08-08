import "server-only";
import { createHash } from "node:crypto";

/**
 * Who is making this request, as far as the edge can tell.
 *
 * Two different answers, for two different purposes, and conflating them is
 * the mistake this module exists to prevent:
 *
 *   ipHash  — for rate limiting. A salted hash limits exactly as well as a raw
 *             address and is not a data-protection liability. This is the
 *             default and what almost everything should use.
 *
 *   rawIp   — for the contract audit trail ONLY. A hashed address is worthless
 *             as evidence: you cannot show a hash to anyone and have it mean
 *             anything. Storing it is a deliberate, narrow exception, and it
 *             is retained indefinitely alongside the contract it belongs to.
 *
 * Neither is trustworthy in the sense of being unforgeable — x-forwarded-for
 * is a header and headers can be set. It is corroborating detail, not proof,
 * and the signature does not rest on it.
 */

export type RequestIdentity = {
  rawIp: string;
  ipHash: string;
  userAgent: string;
};

export function requestIdentity(request: Request): RequestIdentity {
  // Left-most entry is the original client; everything after is proxies.
  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("cf-connecting-ip") ??
    "";

  const ipHash = rawIp
    ? createHash("sha256")
        .update(rawIp + (process.env.EMAIL_LOG_SECRET ?? ""))
        .digest("hex")
        .slice(0, 32)
    : "";

  return {
    rawIp,
    ipHash,
    // Bounded: this is stored, and a header is attacker-controlled in both
    // content and length.
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 512),
  };
}
