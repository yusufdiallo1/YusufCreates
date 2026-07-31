"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { FieldError } from "@/components/ui/FieldError";
import { validateEmail, validateUrl } from "@/lib/validate";
import { playConfirmation } from "@/lib/sound";
import type { Id } from "@convex/_generated/dataModel";
import { AuditProgress } from "@/components/marketing/AuditProgress";

/**
 * Free audit.
 *
 * The result is subscribed to rather than awaited: PageSpeed takes 15-40
 * seconds on a cold URL, so the request returns an id immediately and the row
 * fills in when the run completes. A spinner that sits for forty seconds is
 * indistinguishable from a broken page.
 */
/** Report order. Performance first — it is what people feel. */
const CATEGORY_ORDER = [
  { id: "performance", label: "Speed" },
  { id: "accessibility", label: "Accessibility" },
  { id: "best-practices", label: "Best practices" },
  { id: "seo", label: "SEO" },
] as const;

export function AuditForm() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [auditId, setAuditId] = useState<Id<"audits"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openedAt = useRef<number | null>(null);
  openedAt.current ??= Date.now();

  const audit = useQuery(
    api.audits.get,
    auditId ? { id: auditId } : "skip",
  );

  const urlProblem = validateUrl(url);
  const emailProblem = validateEmail(email);
  const valid = url.trim() !== "" && !urlProblem && !emailProblem;

  if (auditId) {
    return <Result audit={audit} onReset={() => setAuditId(null)} />;
  }

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, email, companyWebsite: company }),
          });
          const json = await res.json();
          if (!res.ok) {
            setError(json.error ?? "That didn't work.");
            return;
          }
          if (json.id) {
            playConfirmation();
            setAuditId(json.id);
          }
        } catch {
          setError("That didn't work. Try again in a moment.");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-10 space-y-4"
    >
      <div>
        <label htmlFor="audit-url" className="text-sm text-secondary">
          Your site
        </label>
        <input
          id="audit-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yoursite.com"
          className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary placeholder:text-secondary"
        />
        <FieldError>{url.trim() ? urlProblem : null}</FieldError>
      </div>

      <div>
        <label htmlFor="audit-email" className="text-sm text-secondary">
          Where to send the results
        </label>
        <input
          id="audit-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary placeholder:text-secondary"
        />
        <FieldError>{email.trim() ? emailProblem : null}</FieldError>
      </div>

      {/* Honeypot. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="audit-company">Company website</label>
        <input
          id="audit-company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <p className="text-xs text-secondary">
        By requesting this you agree to the{" "}
        <Link href="/legal/privacy" className="text-accent">
          privacy policy
        </Link>
        . I use your address to send the results, and nothing else.
      </p>

      <button
        type="submit"
        disabled={!valid || busy}
        className="rounded-full bg-[color:var(--accent-solid)] px-6 py-3 text-sm font-medium text-white transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Starting…" : "Run the audit"}
      </button>

      {error ? <FieldError>{error}</FieldError> : null}
    </form>
  );
}

function Result({
  audit,
  onReset,
}: {
  audit:
    | {
        status: string;
        score?: number;
        categories?: Record<string, number | undefined>;
        fixes?: { title: string; detail: string; impact: string }[];
        issues?: {
          title: string;
          detail?: string;
          category: string;
          score?: number;
          savingsMs?: number;
        }[];
        siteName?: string;
        siteLogo?: string;
        siteDescription?: string;
        error?: string;
        url: string;
      }
    | null
    | undefined;
  onReset: () => void;
}) {
  const reduceMotion = useReducedMotion();

  if (!audit || audit.status === "queued" || audit.status === "running") {
    return <AuditProgress />;
  }

  if (audit.status === "failed") {
    return (
      <div className="mt-12">
        <p className="text-lg text-primary">That one didn&apos;t work</p>
        <p className="mt-2 text-sm text-secondary">
          {audit.error ?? "The site could not be reached."}
        </p>

        {/* A rate limit is temporary and not their fault, so it gets a
            different next step to a URL that genuinely cannot be reached —
            telling someone to "try another address" when the address was
            fine is how a working lead gets thrown away. */}
        <p className="mt-3 text-sm text-secondary">
          {audit.error?.includes("rate limited")
            ? "Nothing to do with your site — the measuring service is busy. Try again in a few minutes, or email me and I'll run it by hand."
            : "If the address is right and public, send it over and I'll take a look myself."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onReset}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas"
          >
            Try again
          </button>
          <a
            href="mailto:hello@yusufcreates.com?subject=Site%20audit"
            className="hairline rounded-full px-5 py-2.5 text-sm text-primary transition-colors duration-fast hover:bg-surface-2"
          >
            Email me instead
          </a>
        </div>
      </div>
    );
  }

  const score = audit.score ?? 0;
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="mt-12">
      {/* Their name and mark, not just a URL. A report that opens with the
          reader's own branding reads as being about them; one that opens with
          a bare address reads as a form response. All best-effort — a site
          with no metadata simply shows its URL as before. */}
      {audit.siteName || audit.siteLogo ? (
        <div className="mb-10 flex items-center justify-center gap-4">
          {audit.siteLogo ? (
            // Plain img: an arbitrary third-party URL, so it cannot go
            // through next/image without allowing every host on the web.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={audit.siteLogo}
              alt=""
              className="hairline size-12 rounded-lg object-cover"
              loading="lazy"
            />
          ) : null}
          <div className="min-w-0">
            {audit.siteName ? (
              <p className="truncate text-lg text-primary">{audit.siteName}</p>
            ) : null}
            {audit.siteDescription ? (
              <p className="mt-0.5 line-clamp-2 max-w-md text-xs text-secondary">
                {audit.siteDescription}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col items-center">
        <svg width={140} height={140} viewBox="0 0 140 140" role="img"
             aria-label={`Overall score ${score} out of 100`}>
          <circle
            cx={70} cy={70} r={54} fill="none"
            stroke="var(--bg-surface-2)" strokeWidth={10}
          />
          <motion.circle
            cx={70} cy={70} r={54} fill="none"
            stroke="var(--accent)" strokeWidth={10} strokeLinecap="round"
            transform="rotate(-90 70 70)"
            strokeDasharray={circumference}
            initial={reduceMotion ? false : { strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: circumference * (1 - score / 100),
            }}
            transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          <text
            x={70} y={78} textAnchor="middle"
            className="fill-[color:var(--text-primary)] text-3xl tabular-nums"
          >
            {score}
          </text>
        </svg>
        <p className="mt-3 text-sm text-secondary">{audit.url}</p>
      </div>

      {audit.categories ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Performance", audit.categories.performance],
            ["Accessibility", audit.categories.accessibility],
            ["Best practices", audit.categories.bestPractices],
            ["SEO", audit.categories.seo],
          ].map(([label, value]) => (
            <div key={String(label)} className="hairline rounded-xl bg-surface-1 p-4">
              <p className="text-xs text-secondary">{label}</p>
              <p className="mt-1.5 text-xl text-primary tabular-nums">
                {value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {audit.fixes && audit.fixes.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-lg">The three things worth fixing first</h2>
          <ol className="mt-5 space-y-6">
            {audit.fixes.map((fix, i) => (
              <li key={fix.title} className="hairline-t flex gap-5 pt-5">
                <span className="text-xs text-secondary tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-base text-primary">{fix.title}</h3>
                  <p className="mt-1 text-sm text-secondary">{fix.detail}</p>
                  <p className="mt-1.5 text-xs text-[color:var(--text-notice)]">
                    {fix.impact}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* The honest total. Three fixes is what someone acts on; this is how
          many there actually are, grouped so the shape of the problem is
          visible rather than a flat wall of forty rows. */}
      {audit.issues && audit.issues.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-lg">
            Everything else found ({audit.issues.length})
          </h2>
          <p className="mt-1.5 text-sm text-secondary">
            The full list, worst first. Not all of these are worth your time —
            the three above are the ones I would start with.
          </p>

          <div className="mt-6 space-y-8">
            {CATEGORY_ORDER.map((cat) => {
              const inCat = audit.issues!.filter((i) => i.category === cat.id);
              if (inCat.length === 0) return null;

              return (
                <div key={cat.id}>
                  <h3 className="text-xs tracking-normal text-secondary uppercase">
                    {cat.label} · {inCat.length}
                  </h3>
                  <ul className="mt-3 divide-y divide-[color:var(--border-hairline)]">
                    {inCat.map((issue, i) => (
                      <li key={`${issue.title}-${i}`} className="py-3">
                        <div className="flex items-baseline gap-3">
                          {/* A dot rather than a number: severity, not rank. */}
                          <span
                            aria-hidden="true"
                            className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                              (issue.score ?? 1) < 0.5
                                ? "bg-[color:var(--danger)]"
                                : "bg-[color:var(--text-notice)]"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-primary">{issue.title}</p>
                            {issue.detail ? (
                              <p className="mt-1 text-xs text-secondary">
                                {issue.detail}
                              </p>
                            ) : null}
                            {issue.savingsMs && issue.savingsMs > 100 ? (
                              <p className="mt-1 text-xs text-[color:var(--text-notice)]">
                                About {(issue.savingsMs / 1000).toFixed(1)}s
                                faster if fixed.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mt-12 rounded-xl bg-surface-1 p-6 text-center">
        <p className="text-primary">Want these fixed properly?</p>
        <p className="mt-1.5 text-sm text-secondary">
          This is the kind of work I do. No pressure — the audit is yours either
          way.
        </p>
        <Link
          href="/pricing"
          className="mt-5 inline-block rounded-full bg-[color:var(--accent-solid)] px-5 py-2.5 text-sm font-medium text-white"
        >
          Start a project
        </Link>
      </div>
    </div>
  );
}
