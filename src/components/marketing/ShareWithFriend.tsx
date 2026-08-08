"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/track";
import { shareId } from "@/lib/referral";
import { Modal } from "@/components/ui/Modal";

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

const MESSAGE =
  "Thought of you — Yusuf builds websites and web apps properly. This link gets you 10% off:";

/**
 * The footer entry point — a link, not the whole block.
 *
 * The share controls used to sit open in the footer, which gave four buttons
 * equal weight with the newsletter beside them for an offer most visitors
 * are not ready to act on. Behind a link they are there for the person
 * looking for them and quiet for everyone else.
 */
export function ShareWithFriendLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        Refer a friend
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Know someone who needs a site?"
        description="Send them this link and they get 10% off their project, good for 14 days. Applies to everything except Enterprise."
      >
        <ShareWithFriend inModal />
      </Modal>
    </>
  );
}

export function ShareWithFriend({ inModal = false }: { inModal?: boolean }) {
  /*
   * Resolved after hydration. The URL depends on window.location and the id on
   * localStorage, neither of which the server can see, so computing either
   * during render would make the two passes disagree.
   */
  const [url, setUrl] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Lands on /pricing, not the homepage. Someone arriving with a discount
    // wants to see what it applies to, and the panel that hands them the code
    // renders on every marketing route anyway.
    setUrl(`${window.location.origin}/pricing?ref=${shareId()}`);
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
      {/* The modal states the offer in its own title and description, so
          repeating it here would say the same thing twice in one panel. */}
      {inModal ? null : (
        <>
          <p className="text-sm text-primary">Know someone who needs a site?</p>
          <p className="mt-1.5 text-xs text-secondary">
            Send them this link and they get 10% off their project, good for 14
            days. Applies to everything except Enterprise.
          </p>
        </>
      )}

      <div className={`flex flex-wrap gap-2 ${inModal ? "" : "mt-4"}`}>
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
                track("cta_click", { cta: "share_native" });
              } catch {
                // Includes the user simply cancelling the sheet, which is not
                // an error and must not surface as one.
              }
            }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90"
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
              track("cta_click", { cta: "share_copy" });
            } catch {
              // Clipboard can be blocked; selecting the text still works.
            }
          }}
          className="hairline rounded-full px-4 py-2 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
          aria-live="polite"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>

        <a
          href={`https://wa.me/?text=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("cta_click", { cta: "share_whatsapp" })}
          className="hairline rounded-full px-4 py-2 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
        >
          WhatsApp
        </a>

        <a
          href={`mailto:?subject=${encodeURIComponent("A developer worth knowing")}&body=${encoded}`}
          onClick={() => track("cta_click", { cta: "share_email" })}
          className="hairline rounded-full px-4 py-2 text-xs text-primary transition-colors duration-hover ease-hover hover:bg-surface-2"
        >
          Email
        </a>
      </div>
    </div>
  );
}
