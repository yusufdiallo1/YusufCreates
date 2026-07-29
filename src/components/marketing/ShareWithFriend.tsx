"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/track";

/**
 * Share the site with someone, and they get 10% off for 14 days.
 *
 * The share id is generated per visitor and carried in the URL, so the code
 * issued to whoever follows the link is idempotent per share — reloading the
 * landing page does not mint another one.
 *
 * navigator.share is the whole feature on a phone: it opens the real system
 * sheet with Messages, WhatsApp, Mail and everything else the person actually
 * has installed. Hand-rolling a row of service buttons means guessing which
 * apps someone uses and getting it wrong. Desktop, where the API mostly does
 * not exist, falls back to copying the link plus explicit mail and WhatsApp
 * links, which are the two that work everywhere.
 */

const SHARE_KEY = "yc.ref";

function shareId(): string {
  try {
    const existing = localStorage.getItem(SHARE_KEY);
    if (existing) return existing;
    const made = crypto.randomUUID().slice(0, 8);
    localStorage.setItem(SHARE_KEY, made);
    return made;
  } catch {
    return crypto.randomUUID().slice(0, 8);
  }
}

const MESSAGE =
  "Thought of you — Yusuf builds websites and web apps properly. This link gets you 10% off:";

export function ShareWithFriend() {
  /*
   * Resolved after hydration. The URL depends on window.location and the id on
   * localStorage, neither of which the server can see, so computing either
   * during render would make the two passes disagree.
   */
  const [url, setUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/?ref=${shareId()}`);
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!url) {
    // Reserved rather than absent, so the footer does not jump on hydration.
    return <div className="h-24" aria-hidden="true" />;
  }

  const encoded = encodeURIComponent(`${MESSAGE} ${url}`);

  return (
    <div>
      <p className="text-sm text-primary">Know someone who needs a site?</p>
      <p className="mt-1.5 text-xs text-secondary">
        Send them this link and they get 10% off their project, good for 14
        days. Applies to everything except Enterprise.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {canShare ? (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.share({
                  title: "YusufCreates",
                  text: MESSAGE,
                  url,
                });
                track("cta_click", { step: "share_native" });
              } catch {
                // Includes the user simply cancelling the sheet, which is not
                // an error and must not surface as one.
              }
            }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
          >
            Share
          </button>
        ) : null}

        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              track("cta_click", { step: "share_copy" });
            } catch {
              // Clipboard can be blocked; selecting the text still works.
            }
          }}
          className="hairline rounded-full px-4 py-2 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
          aria-live="polite"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>

        <a
          href={`https://wa.me/?text=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("cta_click", { step: "share_whatsapp" })}
          className="hairline rounded-full px-4 py-2 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
        >
          WhatsApp
        </a>

        <a
          href={`mailto:?subject=${encodeURIComponent("A developer worth knowing")}&body=${encoded}`}
          onClick={() => track("cta_click", { step: "share_email" })}
          className="hairline rounded-full px-4 py-2 text-xs text-primary transition-colors duration-fast hover:bg-surface-2"
        >
          Email
        </a>
      </div>
    </div>
  );
}
