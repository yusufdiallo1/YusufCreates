"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { Reveal } from "@/components/motion/Reveal";
import { SubmitSuccess } from "@/components/marketing/SubmitSuccess";
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

  const set = (key: string) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const activePlan = getPlan(plan);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email ?? "");
  // Phone is optional in general, but required if they ask to be phoned —
  // otherwise the preference is unactionable.
  const wantsCall =
    values.contactPreference === "Phone call" ||
    values.contactPreference === "WhatsApp";
  const phoneOk = !wantsCall || (values.phone ?? "").trim().length >= 6;

  const planChosen = plan !== "";
  const contactValid = (values.name ?? "").trim() !== "" && emailOk && phoneOk;

  const detailsValid =
    activePlan?.fields.every((f) => {
      const def = FIELDS[f];
      if (!def.required) return true;
      return (values[f] ?? "").trim() !== "";
    }) ?? false;

  const isValid = planChosen && contactValid && detailsValid;

  if (sent) {
    const summary = buildSummary(values, activePlan?.label);
    return <SubmitSuccess summary={summary} />;
  }

  const TOTAL = 4;

  return (
    <div>
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
                  required={wantsCall}
                />
                <Select
                  id="contactPreference"
                  label="Best way to reach you"
                  value={values.contactPreference ?? ""}
                  onChange={set("contactPreference")}
                  options={CONTACT_PREFERENCES}
                  allowEmpty={false}
                />
                {wantsCall && !phoneOk ? (
                  <p className="text-xs text-secondary">
                    A number is needed for that — or switch back to email.
                  </p>
                ) : null}
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
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-full px-4 py-2 text-sm text-secondary transition-colors duration-fast hover:text-primary disabled:opacity-40"
        >
          Back
        </button>

        {step < TOTAL ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 1 && !planChosen) ||
              (step === 2 && !contactValid) ||
              (step === 3 && !detailsValid)
            }
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
}: {
  id: FieldId;
  value: string;
  onChange: (v: string) => void;
}) {
  const def = FIELDS[id];

  if (def.kind === "select") {
    return (
      <Select
        id={id}
        label={def.label}
        value={value}
        onChange={onChange}
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
          className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary"
        />
        {def.help ? (
          <p className="mt-1.5 text-xs text-secondary">{def.help}</p>
        ) : null}
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
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-describedby={helpId}
        onChange={(e) => onChange(e.target.value)}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-2.5 text-sm text-primary"
      />
      {help ? (
        <p id={helpId} className="mt-1.5 text-xs text-secondary">
          {help}
        </p>
      ) : null}
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
  help,
  allowEmpty = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
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
        aria-describedby={helpId}
        onChange={(e) => onChange(e.target.value)}
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
