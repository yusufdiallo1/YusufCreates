import "server-only";

/**
 * A minimal ZIP writer. Stored entries only, no compression.
 *
 * Built rather than installed, for the same reason downloadCsv in
 * TableToolbar.tsx is hand-rolled: the alternative is a dependency for eighty
 * lines of well-specified format, on a project that has already spent effort
 * removing dependencies it did not need.
 *
 * No deflate, deliberately. Intake assets are logos, photographs, PDFs and
 * font files — all already compressed. Deflating a JPEG typically saves under
 * 2% and costs a compression pass over every byte of a 200MB download. STORE
 * is honest about that trade rather than pretending to work.
 *
 * ZIP64 is not supported, so this is correct up to 4GB total and 65,535
 * files. An intake that exceeds either has a much larger problem than its
 * download format.
 */

/* CRC32, table-driven. The table is built once on first use — 256 entries is
   too small to be worth shipping as a literal, and too slow to recompute per
   file. */
let CRC_TABLE: Uint32Array | null = null;

function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      // 0xedb88320 is the reversed polynomial; ZIP uses the reflected form.
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  CRC_TABLE = table;
  return table;
}

function crc32(bytes: Uint8Array): number {
  const table = crcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * MS-DOS date/time. The format predates Unix timestamps in archives and every
 * unzip implementation still reads it: two 16-bit words, seconds at 2-second
 * granularity, years counted from 1980.
 */
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f);
  const d =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, date: d };
}

export type ZipEntry = {
  /** Path inside the archive. Forward slashes, no leading slash. */
  name: string;
  data: Uint8Array;
  /** Defaults to now. Only the modification stamp; ZIP has nothing finer. */
  modified?: Date;
};

/** Windows forbids these outright; every one of them is legal on Linux. */
const RESERVED = new Set(["<", ">", ":", '"', "|", "?", "*"]);

/**
 * Names that are safe inside an archive and on the filesystem it lands on.
 *
 * A zip is one of the classic path-traversal vectors — an entry called
 * `../../.ssh/authorized_keys` is a valid archive, and some extractors will
 * happily write it. These names come from client-uploaded filenames, which is
 * exactly the untrusted input that attack needs.
 */
function safeName(name: string): string {
  const cleaned = name
    .replace(/\\/g, "/")
    // Every traversal segment, not just the leading ones.
    .split("/")
    .filter((part) => part !== "" && part !== "." && part !== "..")
    .join("/")
    /*
     * Control characters stripped by code point rather than by regex.
     *
     * A character class covering the control range needs an escape ESLint's
     * no-control-regex rejects, and writing that range as literal bytes
     * leaves invisible characters in the source — which is both unreadable
     * and one typo away from `[ -<]`, a range that silently eats digits.
     */
    .split("")
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return "_";
      return RESERVED.has(ch) ? "_" : ch;
    })
    .join("")
    .slice(0, 200);

  return cleaned || "file";
}

/**
 * Builds the archive in memory.
 *
 * In memory rather than streamed because the caller has to fetch every file
 * from Convex storage first anyway, and a streaming implementation that still
 * buffers each entry whole buys complexity rather than headroom. If an intake
 * ever holds enough to strain a serverless function's memory, the answer is a
 * signed-URL manifest, not a cleverer zip.
 */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();

  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  /** Guards against two uploads sharing a filename and silently overwriting. */
  const used = new Set<string>();

  for (const entry of entries) {
    let name = safeName(entry.name);
    if (used.has(name)) {
      const dot = name.lastIndexOf(".");
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      let n = 2;
      while (used.has(`${stem} (${n})${ext}`)) n += 1;
      name = `${stem} (${n})${ext}`;
    }
    used.add(name);

    const nameBytes = encoder.encode(name);
    const crc = crc32(entry.data);
    const { time, date } = dosDateTime(entry.modified ?? new Date());
    const size = entry.data.length;

    /* ------------------------------------------------ local file header --- */
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed (2.0)
    /*
     * Bit 11 — the filename is UTF-8.
     *
     * Without it, extractors fall back to CP437 and a client's "Logo –
     * final.svg" arrives with mojibake where the dash was. Uploaded names
     * routinely carry accents and typographic punctuation.
     */
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true); // method 0 = stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); // compressed
    lv.setUint32(22, size, true); // uncompressed
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra field length
    local.set(nameBytes, 30);

    locals.push(local, entry.data);

    /* -------------------------------------------- central directory record --- */
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 name, as above
    cv.setUint16(10, 0, true); // method
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra
    cv.setUint16(32, 0, true); // comment
    cv.setUint16(34, 0, true); // disk number
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, offset, true); // offset of local header
    central.set(nameBytes, 46);

    centrals.push(central);

    offset += local.length + size;
  }

  /* ------------------------------------------- end of central directory --- */
  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true); // this disk
  ev.setUint16(6, 0, true); // disk with central dir
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true); // comment length

  const parts = [...locals, ...centrals, end];
  const total = parts.reduce((sum, p) => sum + p.length, 0);

  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
