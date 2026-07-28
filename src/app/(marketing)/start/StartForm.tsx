"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { Reveal } from "@/components/motion/Reveal";
import { SubmitSuccess } from "@/components/marketing/SubmitSuccess";
import { FieldError } from "@/components/ui/FieldError";
import { playConfirmation } from "@/lib/sound";
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateUrl,
} from "@/lib/validate";
import {
  CONTACT_PREFERENCES,
  FIELDS,
  PLANS,
  getPlan,
  planFromTier,
  type FieldId,
  type PlanId,
} from "@/lib/inquiry";

/**
 * Four-step lead form, branching by plan.
 *
 * Step 1 picks the plan, and that choice decides which questions step 3 asks.
 * Enterprise takes a different path entirely — no budget dropdown, because at
 * that size the number comes out of a scoping call, and putting a band on the
 * record before anyone has scoped anything just anchors the conversation
 * wrongly. It asks about procurement, sign-off and NDA instead, which is what
 * actually determines whether the work can start.
 *
 * Steps advance with ordinary buttons — moving between steps is trivially
 * reversible and does not deserve a deliberate-friction gesture. Only the final
 * submit uses SlideToConfirm, because sending the enquiry is the one action
 * here that cannot be taken back.
 */

type Values = Record<string, string>;

export function StartForm() {
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Honeypot: hidden from sighted users and screen readers alike.
  const [companyWebsite, setCompanyWebsite] = useState("");
  // Time trap. Stamped on first render so it measures time on the form.
  const openedAt = useRef<number | null>(null);
  openedAt.current ??= Date.now();
  const formRef = useRef<HTMLDivElement>(null);

  const tier = params.get("tier") ?? "";
  // Arriving from a pricing CTA answers step 1 already; don't ask again.
  const [plan, setPlan] = useState<PlanId | "">(planFromTier(tier) ?? "");

  const [values, setValues] = useState<Values>({
    name: "",
    email: "",
    phone: "",
    contactPreference: "Email",
    message: "",
  });

  // Which fields have been left once. Errors show only after that, or after a
  // failed attempt to advance — nobody should be corrected mid-word.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (key: string) =>
    setTouched((t) => ({ ...t, [key]: true }));

  const set = (key: string) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const activePlan = getPlan(plan);

  // Phone is optional in general, but required if they ask to be phoned —
  // otherwise the preference is unactionable.
  const wantsCall =
    values.contactPreference === "Phone call" ||
    values.contactPreference === "WhatsApp";

  /**
   * Single source of truth for what is wrong with a field. Both the inline
   * message and the Next button read this, so the button can never be enabled
   * while a visible error contradicts it.
   */
  function problemWith(key: string): string | null {
    const value = values[key] ?? "";

    if (key === "name") return validateRequired(value, "your name");
    if (key === "email") return validateEmail(value);
    if (key === "phone") return validatePhone(value, wantsCall);
    if (key === "existingUrl") return validateUrl(value);

    const def = FIELDS[key as FieldId];
    if (def?.required) {
      return validateRequired(value, def.label.toLowerCase().replace(/\?$/, ""));
    }
    return null;
  }

  /** Shown only once the field has been touched. */
  const errorFor = (key: string) => (touched[key] ? problemWith(key) : null);

  /** Touches every field on a step so its problems all surface at once. */
  function revealProblems(keys: string[]) {
    setTouched((t) => {
      const next = { ...t };
      for (const k of keys) next[k] = true;
      return next;
    });
  }

  const CONTACT_KEYS = ["name", "email", "phone"];
  const planKeys: string[] = activePlan?.fields ?? [];

  /**
   * Moves to a step and returns the viewport to the top of the form.
   *
   * Without this, advancing from a long step leaves you scrolled halfway down
   * the next one, staring at its middle with no idea the heading changed —
   * which on a phone reads as the button having done nothing at all.
   *
   * Scrolls to the form, not to document top, so the page header does not eat
   * the first field.
   */
  function goToStep(next: number) {
    setStep(next);
    if (typeof window === "undefined") return;
    const top = formRef.current?.getBoundingClientRect().top ?? 0;
    window.scrollTo({
      top: Math.max(0, window.scrollY + top - 24),
      // Honour the same preference the rest of the site does.
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  const planChosen = plan !== "";
  const contactValid = CONTACT_KEYS.every((k) => problemWith(k) === null);
  const detailsValid =
    activePlan !== undefined && planKeys.every((k) => problemWith(k) === null);

  const isValid = planChosen && contactValid && detailsValid;

  if (sent) {
    const summary = buildSummary(values, activePlan?.label);
    return <SubmitSuccess summary={summary} />;
  }

  const TOTAL = 4;

  return (
    <div ref={formRef}>
      <h1 className="text-3xl">Start a project</h1>
      <p className="mt-3 text-secondary">
        Four short steps. Nothing here is binding.
      </p>

      <ol aria-label="Progress" className="mt-8 flex gap-2">
        {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => (
          <li
            key={n}
            aria-current={step === n ? "step" : undefined}
            className={`h-1 flex-1 rounded-full ${
              n <= step ? "bg-accent" : "bg-surface-3"
            }`}
          />
        ))}
      </ol>

      <div className="mt-10">
        {step === 1 ? (
          <Reveal>
            <fieldset>
              <legend className="text-lg">What kind of project?</legend>
              <p className="mt-2 text-sm text-secondary">
                This decides what I ask next, so pick the closest fit.
              </p>

              <div
                role="radiogroup"
                aria-label="Project type"
                className="mt-6 space-y-3"
              >
                {PLANS.map((p) => {
                  const active = plan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPlan(p.id)}
                      className={`hairline block w-full rounded-lg px-5 py-4 text-left transition-colors duration-fast ${
                        active
                          ? "border-[color:var(--accent)] bg-surface-2"
                          : "bg-surface-1 hover:bg-surface-2"
                      }`}
                    >
                      <span className="block text-sm text-primary">
                        {p.label}
                      </span>
                      <span className="mt-1 block text-xs text-secondary">
                        {p.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </Reveal>
        ) : null}

        {step === 2 ? (
          <Reveal>
            <fieldset>
              <legend className="text-lg">How do I reach you?</legend>
              <div className="mt-6 space-y-4">
                <Field
                  id="name"
                  label="Name"
                  value={values.name ?? ""}
                  onChange={set("name")}
                  onBlur={() => markTouched("name")}
                  error={errorFor("name")}
                  required
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={values.email ?? ""}
                  onChange={set("email")}
                  onBlur={() => markTouched("email")}
                  error={errorFor("email")}
                  required
                />
                <Field
                  id="phone"
                  label={wantsCall ? "Phone number" : "Phone number (optional)"}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+966 …"
                  help="Include the country code."
                  value={values.phone ?? ""}
                  onChange={set("phone")}
                  onBlur={() => markTouched("phone")}
                  error={errorFor("phone")}
                  required={wantsCall}
                />
                <Select
                  id="contactPreference"
                  label="Best way to reach you"
                  value={values.contactPreference ?? ""}
                  onChange={(v) => {
                    set("contactPreference")(v);
                    // Switching to a call makes an empty phone field a problem,
                    // so surface it immediately rather than at the Next click.
                    if (v === "Phone call" || v === "WhatsApp") {
                      markTouched("phone");
                    }
                  }}
                  options={CONTACT_PREFERENCES}
                  allowEmpty={false}
                />
              </div>
            </fieldset>
          </Reveal>
        ) : null}

        {step === 3 && activePlan ? (
          <Reveal>
            <fieldset>
              <legend className="text-lg">About the project</legend>
              {activePlan.skipsPricing ? (
                <p className="mt-2 text-sm text-secondary">
                  No budget question here — at this size the number comes out of
                  a scoping call, not a dropdown.
                </p>
              ) : null}

              <div className="mt-6 space-y-4">
                {activePlan.fields.map((f) => (
                  <PlanField
                    key={f}
                    id={f}
                    value={values[f] ?? ""}
                    onChange={set(f)}
                    onBlur={() => markTouched(f)}
                    error={errorFor(f)}
                  />
                ))}
              </div>
            </fieldset>
          </Reveal>
        ) : null}

        {step === 4 && activePlan ? (
          <Reveal>
            <fieldset>
              <legend className="text-lg">Anything else?</legend>
              <div className="mt-6">
                <label htmlFor="message" className="text-sm text-secondary">
                  {activePlan.messagePrompt}
                </label>
                <textarea
                  id="message"
                  rows={6}
                  value={values.message ?? ""}
                  onChange={(e) => set("message")(e.target.value)}
                  className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary"
                />
              </div>

              <div className="mt-10">
                {/* The one irreversible action in this flow. onConfirm is
                    awaited by the control, which handles its own pending and
                    rollback states — no extra spinner or toast here. */}
                <SlideToConfirm
                  purpose="submit-lead"
                  ariaLabel="Slide to send your project inquiry"
                  disabled={!isValid}
                  onConfirm={async (signals) => {
                    setError(null);
                    const res = await fetch("/api/lead", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...values,
                        plan,
                        projectType: activePlan.label,
                        tier: tier || undefined,
                        source: "start-form",
                        slideSignals: signals,
                        companyWebsite,
                        elapsedMs: Date.now() - (openedAt.current ?? 0),
                      }),
                    });
                    if (!res.ok) {
                      setError("That didn't send. Try again in a moment.");
                      throw new Error("Submit failed");
                    }
                    // Fires only on a confirmed 2xx, so the sound always
                    // means the enquiry actually landed.
                    playConfirmation();
                    setSent(true);
                  }}
                />
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-3 min-h-4 text-xs text-secondary"
                >
                  {error}
                </p>
              </div>
            </fieldset>
          </Reveal>
        ) : null}
      </div>

      {/* Honeypot. aria-hidden plus tabIndex -1 keeps it away from screen
          readers and keyboard users; only a bot filling every field hits it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="company-website">Company website</label>
        <input
          id="company-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={companyWebsite}
          onChange={(e) => setCompanyWebsite(e.target.value)}
        />
      </div>

      <div className="mt-10 flex justify-between">
        <button
          type="button"
          onClick={() => goToStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="rounded-full px-4 py-2 text-sm text-secondary transition-colors duration-fast hover:text-primary disabled:opacity-40"
        >
          Back
        </button>

        {step < TOTAL ? (
          // Not disabled while incomplete. A dead button explains nothing —
          // pressing it reveals exactly which fields are unfinished, which is
          // the only way to find out on a keyboard or a screen reader.
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !planChosen) return;
              if (step === 2 && !contactValid) {
                revealProblems(CONTACT_KEYS);
                return;
              }
              if (step === 3 && !detailsValid) {
                revealProblems(planKeys);
                return;
              }
              goToStep(step + 1);
            }}
            disabled={step === 1 && !planChosen}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
          >
            Next
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Renders one plan-specific field from its definition. */
function PlanField({
  id,
  value,
  onChange,
  onBlur,
  error,
}: {
  id: FieldId;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
}) {
  const def = FIELDS[id];

  if (def.kind === "select") {
    return (
      <Select
        id={id}
        label={def.label}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        error={error}
        options={def.options ?? []}
        help={def.help}
      />
    );
  }

  if (def.kind === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={value === "yes"}
          onChange={(e) => onChange(e.target.checked ? "yes" : "no")}
          className="h-4 w-4 rounded border-[color:var(--border-hairline)] bg-surface-1"
        />
        <label htmlFor={id} className="text-sm text-secondary">
          {def.label}
        </label>
      </div>
    );
  }

  if (def.kind === "textarea") {
    return (
      <div>
        <label htmlFor={id} className="text-sm text-secondary">
          {def.label}
          {def.required ? null : " (optional)"}
        </label>
        <textarea
          id={id}
          rows={3}
          value={value}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary"
        />
        {def.help ? (
          <p className="mt-1.5 text-xs text-secondary">{def.help}</p>
        ) : null}
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </div>
    );
  }

  return (
    <Field
      id={id}
      label={def.label}
      type={def.kind === "number" ? "number" : "text"}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      required={def.required}
      help={def.help}
      placeholder={def.placeholder}
    />
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  required,
  help,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  type?: string;
  required?: boolean;
  help?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        // No `required` attribute: validation is ours, so the browser never
        // raises its own unstyleable bubble. aria-required keeps the semantics
        // for assistive technology.
        aria-required={required || undefined}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? `${id}-error` : null, helpId].filter(Boolean).join(" ") ||
          undefined
        }
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-2.5 text-sm text-primary"
      />
      {help ? (
        <p id={helpId} className="mt-1.5 text-xs text-secondary">
          {help}
        </p>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  options,
  help,
  allowEmpty = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  options: string[];
  help?: string;
  allowEmpty?: boolean;
}) {
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <select
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? `${id}-error` : null, helpId].filter(Boolean).join(" ") ||
          undefined
        }
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-2.5 text-sm text-primary"
      >
        {allowEmpty ? <option value="">Choose one</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {help ? (
        <p id={helpId} className="mt-1.5 text-xs text-secondary">
          {help}
        </p>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

/** Echoes back what was sent, skipping empty and internal fields. */
function buildSummary(values: Values, planLabel?: string) {
  const rows: { label: string; value: string }[] = [];
  if (planLabel) rows.push({ label: "Project", value: planLabel });

  const named: [string, string][] = [
    ["name", "Name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["contactPreference", "Contact by"],
    ["company", "Company"],
    ["role", "Role"],
    ["budget", "Budget"],
    ["timeline", "Timeline"],
    ["targetLaunch", "Target launch"],
  ];

  for (const [key, label] of named) {
    const v = values[key]?.trim();
    if (v) rows.push({ label, value: v });
  }
  return rows;
}
