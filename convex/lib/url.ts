/**
 * SSRF guard for any URL that came from outside this codebase.
 *
 * Originally written inline in the free-site-audit route, which fetches an
 * address a stranger typed into a form. Lifted here because the monitoring
 * sweep now does something strictly more dangerous: it fetches operator-
 * supplied URLs on a five-minute schedule, from a runtime that sits inside
 * the same trust boundary as the database.
 *
 * Deny by default. Only public http(s) hosts pass. Without this, a URL of
 * 169.254.169.254 reads cloud instance metadata, and one pointed at an
 * internal address maps a private network one status code at a time.
 *
 * What this CANNOT do is stop DNS rebinding — a public hostname that resolves
 * to a private address at connect time. Blocking that needs resolution
 * control the platform's fetch does not expose. It is an accepted limit here
 * because the responses are never shown to the client: monitoring stores a
 * status code and a duration, and the audit path only ever reads meta tags.
 */

/** Private ranges, loopback, link-local and anything not obviously public. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) {
    return true;
  }
  if (h === "metadata.google.internal") return true;

  // IPv6 loopback and unique-local.
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return true;

  const parts = h.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    // AWS/GCP instance metadata.
    if (a === 169 && b === 254) return true;
  }

  return false;
}

/**
 * Parses and vets a URL. Returns null for anything that must not be fetched,
 * so the caller's guard is a single falsy check rather than a checklist it
 * can forget half of.
 */
export function normaliseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    // Only http(s). file:, gopher: and data: are all SSRF vectors.
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    if (isPrivateHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * The registrable hostname, without a leading www.
 *
 * Used for display and for RDAP lookups, which want the domain rather than
 * the full URL. Not a public-suffix parser: "example.co.uk" is returned
 * whole, which is correct, and a deeper subdomain is returned whole too,
 * which RDAP tolerates by walking up.
 */
export function hostnameOf(raw: string): string {
  const url = normaliseUrl(raw);
  return url ? url.hostname.replace(/^www\./, "") : raw;
}
