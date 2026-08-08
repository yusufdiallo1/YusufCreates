/**
 * SHA-256 and the audit-chain hash, in pure TypeScript.
 *
 * WHY NOT node:crypto OR crypto.subtle — the obvious question.
 *
 * The chain is written in three places and has to agree in all three: the
 * Convex mutation that generates a contract, the Node route handler that
 * records a signature, and the Convex query that later verifies the whole
 * chain. node:crypto does not exist in Convex's runtime, and crypto.subtle is
 * async and not guaranteed there either — so using the "real" one would mean
 * TWO implementations of the same hash, and a chain that verifies against a
 * different function than the one that wrote it is not a chain.
 *
 * One implementation, no runtime assumptions, identical everywhere. It is
 * verified against node:crypto in scripts/check-sha256.mjs, which runs the
 * NIST vectors plus a fuzz pass — this file is not trusted on faith.
 *
 * Performance is irrelevant here: we hash a contract body and a handful of
 * small event records, not a stream.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

/** SHA-256 over raw bytes, returned as lowercase hex. */
export function sha256HexBytes(data: Uint8Array): string {
  const len = data.length;
  // Message + 0x80 + 8 length bytes, rounded up to whole 64-byte blocks.
  const blocks = Math.ceil((len + 9) / 64);
  const padded = new Uint8Array(blocks * 64);
  padded.set(data);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  const bitLen = len * 8;
  // Split rather than BigInt: bitLen stays well inside 2^53 for anything we
  // hash, and the high word is written explicitly so the padding is correct
  // for inputs above 512MB even though we will never see one.
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let block = 0; block < blocks; block += 1) {
    const off = block * 64;

    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const a15 = w[i - 15];
      const a2 = w[i - 2];
      const s0 = (rotr(a15, 7) ^ rotr(a15, 18) ^ (a15 >>> 3)) >>> 0;
      const s1 = (rotr(a2, 17) ^ rotr(a2, 19) ^ (a2 >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = [h0, h1, h2, h3, h4, h5, h6, h7];
  return out.map((n) => n.toString(16).padStart(8, "0")).join("");
}

/** SHA-256 over a UTF-8 string, returned as lowercase hex. */
export function sha256Hex(text: string): string {
  return sha256HexBytes(new TextEncoder().encode(text));
}

/**
 * Deterministic JSON: keys sorted at every depth, undefined dropped.
 *
 * JSON.stringify preserves insertion order, so two records with the same
 * content but built in a different order would serialise differently and hash
 * differently. A chain that depends on property order is a chain that breaks
 * when someone reorders an object literal.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
    .join(",")}}`;
}

export type ChainEventInput = {
  type: string;
  at: number;
  seq: number;
  ip?: string;
  userAgent?: string;
  meta?: unknown;
};

/**
 * The link. Each hash covers the one before it, so editing or removing any
 * event invalidates every event after it.
 */
export function chainHash(prevHash: string, event: ChainEventInput): string {
  return sha256Hex(`${prevHash}\n${canonicalJson(event)}`);
}

/** The chain is anchored to the text being signed, not to an arbitrary seed. */
export function genesisHash(bodySnapshot: string): string {
  return sha256Hex(`contract-genesis\n${sha256Hex(bodySnapshot)}`);
}
