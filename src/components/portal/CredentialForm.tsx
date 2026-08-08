"use client";

import { useId, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { FieldError } from "@/components/ui/FieldError";
import { validateRequired } from "@/lib/validate";

/**
 * Where a client puts a password instead of emailing it.
 *
 * The framing matters more than the form. Someone who has been asked for a
 * login is already slightly uneasy, and the two things they want to know are
 * what happens to it and whether there is a way round. Both are answered
 * above the first field rather than in small print underneath.
 *
 * DELEGATED ACCESS IS OFFERED FIRST, FOR EVERY KIND. Not hidden behind a
 * disclosure, not a footnote — the instructions for adding me as a
 * collaborator sit above the password field and are open by default. Almost
 * every registrar, CMS and analytics platform supports it, and a credential
 * I never receive is a credential I can never leak.
 *
 * Write-only. Once submitted the client sees a label, a kind and a mask.
 * There is no reveal, for them or for anyone holding their link.
 */

type Kind =
  | "registrar"
  | "hosting"
  | "cms"
  | "analytics"
  | "email"
  | "api_key"
  | "other";

const KINDS: { id: Kind; label: string }[] = [
  { id: "registrar", label: "Domain registrar" },
  { id: "hosting", label: "Hosting" },
  { id: "cms", label: "CMS" },
  { id: "analytics", label: "Analytics" },
  { id: "email", label: "Email" },
  { id: "api_key", label: "API key" },
  { id: "other", label: "Something else" },
];

/**
 * The better answer, per platform.
 *
 * Written as steps rather than as "check your provider's documentation",
 * because the whole reason people share a password instead is that finding
 * the delegation screen is the harder of the two options. If this is vague it
 * does not work, and I get a password I did not want.
 */
const DELEGATION: Record<Kind, { title: string; steps: string[]; note?: string }> = {
  registrar: {
    title: "Add me to your registrar instead",
    steps: [
      "GoDaddy: Account Settings → Delegate Access → Invite to Access, with “Manage Domains”.",
      "Namecheap: Profile → Account Users → invite, or move the single domain to my account.",
      "Cloudflare: Manage Account → Members → Invite, role “Domain Administrator”.",
      "Squarespace / Google Domains: Settings → Permissions → Add person.",
    ],
    note: "This is the one I most want to avoid holding. A registrar login is the keys to the whole thing — email, domain, and any recovery that runs through them.",
  },
  hosting: {
    title: "Add me to your host instead",
    steps: [
      "Vercel: Project → Settings → Members → Invite.",
      "Netlify: Team → Members → Invite, role “Developer”.",
      "cPanel / Plesk: create an additional user rather than sharing the main one.",
      "AWS / DigitalOcean: create an IAM user or team member scoped to the one project.",
    ],
  },
  cms: {
    title: "Add me as an editor instead",
    steps: [
      "WordPress: Users → Add New, role “Administrator” (or “Editor” if I only need content).",
      "Webflow: Site Settings → Members → Invite.",
      "Shopify: Settings → Users → Add staff, with only the permissions I need.",
      "Sanity / Contentful / Payload: Members or Team → Invite by email.",
    ],
  },
  analytics: {
    title: "Add me as a viewer instead",
    steps: [
      "Google Analytics: Admin → Account Access Management → +, role “Editor” or “Viewer”.",
      "Google Search Console: Settings → Users and permissions → Add user.",
      "Plausible / Fathom: Site Settings → People → Invite.",
    ],
    note: "Analytics almost never needs a shared login. Viewer access is enough for everything I do here.",
  },
  email: {
    title: "Delegate the mailbox instead",
    steps: [
      "Google Workspace: Admin console → Users, or delegate a single mailbox via Settings → Accounts → Grant access.",
      "Microsoft 365: Admin centre → Users → Mail → Manage mailbox delegation.",
    ],
    note: "If this is only about DNS records for email, I do not need mailbox access at all — just the DNS.",
  },
  api_key: {
    title: "Send a scoped key, not the account",
    steps: [
      "Create a NEW key for me rather than sharing an existing one.",
      "Give it the narrowest scope that works — read-only wherever possible.",
      "Note where it was created, so it can be revoked without hunting.",
    ],
    note: "A key made for one purpose can be revoked without breaking anything else. This is the one case where sending me a secret is genuinely fine.",
  },
  other: {
    title: "Check for a “team”, “members” or “sharing” screen first",
    steps: [
      "Most tools have one, usually under Settings.",
      "If it exists, invite me by email instead of sharing the login.",
      "If it does not, or you are not sure, use the form below and I will sort it out.",
    ],
  },
};

export function CredentialForm({
  token,
  className,
}: {
  /** The intake token. Proves which project this belongs to. */
  token: string;
  className?: string;
}) {
  const existing = useQuery(api.credentials.listForToken, { token });
  const submit = useAction(api.credentials.submit);

  const [kind, setKind] = useState<Kind>("registrar");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [notes, setNotes] = useState("");
  const [reveal, setReveal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [secretError, setSecretError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const ids = useId();
  const delegation = DELEGATION[kind];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const le = validateRequired(label, "a name for this");
    const se = validateRequired(secret, "the password or key");
    setLabelError(le);
    setSecretError(se);
    if (le || se) return;

    setBusy(true);
    setError(null);
    try {
      await submit({
        token,
        label,
        kind,
        username: username.trim() || undefined,
        secret,
        notes: notes.trim() || undefined,
      });

      /*
       * Cleared immediately on success. The secret should not sit in a React
       * state tree — or in the browser's form-restore cache — one moment
       * longer than the request needed it.
       */
      setLabel("");
      setUsername("");
      setSecret("");
      setNotes("");
      setReveal(false);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That did not save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      {/* ---------------------------------------------------- the framing --- */}
      <div className="hairline rounded-xl bg-surface-1 p-4">
        <p className="text-sm text-primary">
          Anything you put here is encrypted before it is stored, and I can
          only read it when I actively need it — every time I do, it is logged.
          You will not be able to read it back afterwards.
        </p>
        <p className="mt-2.5 text-sm text-secondary">
          <strong className="text-primary">
            Would you rather add me as a user instead?
          </strong>{" "}
          That is always better. You keep control, you can remove me in one
          click, and I never hold your password at all.
        </p>
      </div>

      {/* ------------------------------------------------------- the kind --- */}
      <fieldset className="mt-6">
        <legend className="text-sm text-primary">What is this for?</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {KINDS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setKind(option.id)}
              aria-pressed={kind === option.id}
              className={`hairline min-h-11 rounded-full px-3.5 text-[13px] transition-colors duration-fast ${
                kind === option.id
                  ? "bg-surface-2 text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ------------------------------------------- delegation, offered first --- */}
      <div className="mt-5 rounded-xl border border-[color:var(--border-hairline)] bg-surface-2 p-4">
        <p className="text-sm font-medium text-primary">{delegation.title}</p>
        <ul className="mt-2.5 space-y-1.5">
          {delegation.steps.map((step) => (
            <li key={step} className="text-[13px] leading-relaxed text-secondary">
              {step}
            </li>
          ))}
        </ul>
        {delegation.note ? (
          <p className="mt-3 text-[13px] leading-relaxed text-primary">
            {delegation.note}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-secondary">
          Invite <strong className="text-primary">hello@yusufcreates.com</strong>
          , then skip the form below entirely.
        </p>
      </div>

      {/* ------------------------------------------------------- the form --- */}
      <form onSubmit={onSubmit} noValidate className="mt-6">
        <p className="text-sm text-secondary">
          If delegated access is not possible for this one, put it here rather
          than in an email.
        </p>

        <div className="mt-4">
          <label htmlFor={`${ids}-label`} className="text-sm text-primary">
            What it opens
          </label>
          <input
            id={`${ids}-label`}
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (labelError) setLabelError(null);
            }}
            placeholder="Namecheap account"
            autoComplete="off"
            aria-invalid={labelError ? true : undefined}
            aria-describedby={labelError ? `${ids}-label-error` : undefined}
            className="hairline mt-2 min-h-11 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-base text-primary placeholder:text-secondary sm:text-sm"
          />
          <FieldError id={`${ids}-label-error`}>{labelError}</FieldError>
        </div>

        <div className="mt-4">
          <label htmlFor={`${ids}-username`} className="text-sm text-primary">
            Username or email{" "}
            <span className="text-secondary">(if there is one)</span>
          </label>
          <input
            id={`${ids}-username`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="email"
            className="hairline mt-2 min-h-11 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-base text-primary placeholder:text-secondary sm:text-sm"
          />
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${ids}-secret`} className="text-sm text-primary">
              Password or key
            </label>
            {/*
              A show/hide toggle, because typing a long generated password
              blind into a phone is how it arrives wrong — and a credential
              that does not work costs another round trip to discover.
            */}
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
            >
              {reveal ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id={`${ids}-secret`}
            type={reveal ? "text" : "password"}
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              if (secretError) setSecretError(null);
            }}
            /*
             * new-password, not current-password. It stops the browser
             * offering to fill one of THEIR saved logins into a field that is
             * about to be transmitted, and stops it offering to save this one
             * against my domain.
             */
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={secretError ? true : undefined}
            aria-describedby={secretError ? `${ids}-secret-error` : undefined}
            className="hairline mt-2 min-h-11 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 font-mono text-base text-primary sm:text-sm"
          />
          <FieldError id={`${ids}-secret-error`}>{secretError}</FieldError>
        </div>

        <div className="mt-4">
          <label htmlFor={`${ids}-notes`} className="text-sm text-primary">
            Anything I should know{" "}
            <span className="text-secondary">(optional)</span>
          </label>
          <textarea
            id={`${ids}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Two-factor codes go to Sam's phone."
            className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-base text-primary placeholder:text-secondary sm:text-sm"
          />
          <p className="mt-1.5 text-xs text-secondary">
            Not encrypted, so keep anything secret out of this box.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 text-[13px] text-[color:var(--danger)]"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--accent-solid)] px-5 text-sm font-medium text-white transition-[filter,opacity] duration-fast hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save securely"}
        </button>

        <span role="status" aria-live="polite" className="sr-only">
          {saved ? "Credential saved." : ""}
        </span>
      </form>

      {/* ------------------------------------------------ what they've sent --- */}
      {existing && existing.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm text-primary">What you have sent me</h3>
          <ul className="mt-3 space-y-2">
            {existing.map((row) => (
              <li
                key={row._id}
                className="hairline flex items-center justify-between gap-3 rounded-lg bg-surface-1 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-primary">{row.label}</p>
                  <p className="truncate text-xs text-secondary">
                    {KINDS.find((k) => k.id === row.kind)?.label ?? row.kind}
                    {row.username ? ` · ${row.username}` : ""}
                  </p>
                </div>
                <span
                  aria-label="Hidden"
                  className="shrink-0 font-mono text-xs text-secondary"
                >
                  {row.masked}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-secondary">
            These cannot be shown again, here or anywhere else. If you lose one,
            reset it wherever it came from — that is safer than me being able
            to read it back to you.
          </p>
        </div>
      ) : null}
    </div>
  );
}
