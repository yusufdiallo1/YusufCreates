"use node";

import { v } from "convex/values";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { internalAction } from "./_generated/server";

/**
 * Application-layer encryption for stored credentials.
 *
 * Convex has no field-level encryption, so this is the layer that provides
 * it. AES-256-GCM, done here and only here, so a database dump on its own is
 * useless: the key lives in CREDENTIAL_ENCRYPTION_KEY and never in a row.
 *
 * `"use node"` because node:crypto is not in Convex's default runtime, and a
 * "use node" module may contain ONLY actions — which is why this file holds
 * nothing but the two primitives and convex/credentials.ts holds every query
 * and mutation that uses them.
 *
 * GCM rather than CBC: it authenticates as well as encrypts. Without the tag
 * an attacker with write access to the database can flip bits in a ciphertext
 * and the decrypt still returns *something*. With it, tampering fails loudly.
 *
 * These are internalActions. Nothing reachable from a browser can call them
 * directly — the only ways in are the audited paths in convex/credentials.ts,
 * which write an access-log row before decrypting anything.
 */

/** Bumped only if the key is ever rotated. Stored per row so old rows decrypt. */
const KEY_VERSION = 1;

/**
 * GCM's standard IV length. 12 bytes rather than 16 is not an oversight: the
 * spec defines the 96-bit case as the one requiring no extra derivation step,
 * and every other length is both slower and more error-prone.
 */
const IV_BYTES = 12;

/**
 * Reads and validates the key.
 *
 * Throws rather than falling back, and that is the single most important
 * decision in this file. A missing key must never degrade to storing
 * plaintext, or to a hardcoded development key — either turns a
 * misconfiguration into a silent, permanent breach that looks like it works.
 *
 * Accepts base64 (the documented format) or hex, because a 64-character hex
 * string is what `openssl rand -hex 32` prints and someone will paste it.
 */
function key(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is not set on the Convex deployment. Generate one with `openssl rand -base64 32` and set it with `npx convex env set CREDENTIAL_ENCRYPTION_KEY '<value>'`. Refusing to store anything unencrypted.",
    );
  }

  const trimmed = raw.trim();
  const buf = /^[0-9a-fA-F]{64}$/.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");

  if (buf.length !== 32) {
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256; got ${buf.length}. Generate one with \`openssl rand -base64 32\`.`,
    );
  }

  return buf;
}

/**
 * Encrypts one secret.
 *
 * A fresh random IV every time. Reusing an IV under the same key in GCM is
 * catastrophic — it leaks the XOR of the two plaintexts and, worse, allows
 * the authentication key to be recovered. Hence randomBytes per call and
 * never a counter, a timestamp, or anything derived from the record.
 */
export const encryptSecret = internalAction({
  args: { plaintext: v.string() },
  handler: async (_ctx, args) => {
    if (args.plaintext.length === 0) {
      throw new Error("Nothing to encrypt.");
    }

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key(), iv);

    const ciphertext = Buffer.concat([
      cipher.update(args.plaintext, "utf8"),
      cipher.final(),
    ]);

    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      keyVersion: KEY_VERSION,
    };
  },
});

/**
 * Decrypts one secret.
 *
 * `decipher.final()` is what verifies the tag, and it throws if the ciphertext
 * or the tag has been altered. That throw is deliberately not caught here —
 * a tamper-detection failure must reach the caller as a failure, not as an
 * empty string that reads like "no password set".
 */
export const decryptSecret = internalAction({
  args: {
    ciphertext: v.string(),
    iv: v.string(),
    authTag: v.string(),
    keyVersion: v.number(),
  },
  handler: async (_ctx, args) => {
    if (args.keyVersion !== KEY_VERSION) {
      throw new Error(
        `This credential was encrypted with key version ${args.keyVersion}, and this deployment holds version ${KEY_VERSION}. It cannot be read with the current key.`,
      );
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(args.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(args.authTag, "base64"));

    try {
      return Buffer.concat([
        decipher.update(Buffer.from(args.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      // Deliberately vague to the caller and specific in the message: the two
      // causes are a wrong key and a modified row, and both are worth knowing
      // about immediately.
      throw new Error(
        "This credential failed its integrity check. Either the encryption key has changed or the stored value has been altered.",
      );
    }
  },
});
