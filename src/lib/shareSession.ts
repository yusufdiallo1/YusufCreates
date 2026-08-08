import "server-only";

/**
 * The share session cookie.
 *
 * Named per share and PATH-SCOPED to that share's own URL, which is why the
 * gated PDF lives at /contract/share/<token>/pdf rather than under /api: a
 * cookie scoped to the page cannot be sent to an /api path, and widening the
 * scope to "/" would attach a document credential to every request the browser
 * makes to this site, including ones with nothing to do with it.
 */
export function shareCookieName(token: string): string {
  // Truncated so the cookie name does not itself carry the full link token
  // into places cookie names get logged.
  return `yc_share_${token.slice(0, 16)}`;
}

export function shareCookiePath(token: string): string {
  return `/contract/share/${token}`;
}
