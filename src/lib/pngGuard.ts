import "server-only";
import { inflateSync } from "node:zlib";

/**
 * Validates a PNG before anything downstream tries to draw it.
 *
 * WHY THIS EXISTS — found by actually signing a contract with a corrupt image.
 *
 * The signature bitmap arrives from the browser as base64 and is therefore
 * attacker-controlled. A PNG with a valid 8-byte header but a corrupt IDAT
 * stream made @react-pdf/renderer spend FOUR AND A HALF MINUTES on the render
 * and then throw `Z_DATA_ERROR` as an **uncaughtException** — which in Node
 * takes down the process, not just the request. Uploading 78 bytes should not
 * be able to do that.
 *
 * So the bytes are proven decodable here, at the boundary, before they are
 * stored. A signature that fails is dropped and the contract is signed
 * without it: the drawn squiggle is corroborating detail, and refusing
 * somebody's signature over a bad canvas export would be the wrong trade.
 */

const MAGIC = "89504e470d0a1a0a";

/** Generous for a signature strip, far below anything that could hurt us. */
const MAX_DIMENSION = 4096;

export function isRenderablePng(bytes: Buffer): boolean {
  if (bytes.length < 45) return false;
  if (bytes.subarray(0, 8).toString("hex") !== MAGIC) return false;

  // IHDR always comes first and carries the dimensions.
  if (bytes.subarray(12, 16).toString("latin1") !== "IHDR") return false;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width === 0 || height === 0) return false;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) return false;

  // Walk the chunks, collecting the compressed image data.
  const idat: Buffer[] = [];
  let offset = 8;
  let sawEnd = false;

  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    // A length field that runs past the buffer is malformed, not merely odd.
    if (length > bytes.length) return false;
    const type = bytes.subarray(offset + 4, offset + 8).toString("latin1");
    const end = offset + 8 + length;
    if (end + 4 > bytes.length) return false;

    if (type === "IDAT") idat.push(bytes.subarray(offset + 8, end));
    if (type === "IEND") {
      sawEnd = true;
      break;
    }
    offset = end + 4;
  }

  if (!sawEnd || idat.length === 0) return false;

  // The actual check. Everything above is cheap structure; this is the one
  // that catches the payload the renderer choked on.
  try {
    const raw = inflateSync(Buffer.concat(idat));
    return raw.length > 0;
  } catch {
    return false;
  }
}
