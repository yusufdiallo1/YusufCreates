"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Three-step lead form.
 *
 * Steps 1 and 2 advance with ordinary buttons — moving between steps is
 * trivially reversible and does not deserve a deliberate-friction gesture.
 * Only the final submit uses SlideToConfirm, because sending the enquiry is
 * the one action here that cannot be taken back.
 */

const PROJECT_TYPES = [
  "Marketing site",
  "Web app or SaaS",
  "Bilingual English and Arabic",
  "Rescue an existing build",
  "Something else",
];

const BUDGETS = [
  "Under $1,000",
  "$1,000 – $3,000",
  "$3,000 – $6,000",
  "$6,000 – $13,000",
  "$13,000+",
  "Not sure yet",
];

const TIMELINES = ["As soon as possible", "1–3 months", "3–6 months", "Just exploring"];

export function StartForm() {
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [sent, setSent] = useState(false);

  const [values, setValues] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    projectType: "",
    tier: params.get("tier") ?? "",
    budget: "",
    timeline: "",
    message: "",
  });

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const stepOneValid = values.name.trim() !== "" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email);
  const isValid = stepOneValid && values.projectType !== "";

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="text-3xl">Thanks — that&apos;s with me.</h1>
        <p className="mt-4 text-secondary">
          I reply to everything within a day. If it&apos;s urgent, email{" "}
          <span className="text-primary">hello@yusufcreates.com</span>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl">Start a project</h1>
      <p className="mt-3 text-secondary">
        Three short steps. Nothing here is binding.
      </p>

      <ol
        aria-label="Progress"
        className="mt-8 flex gap-2"
      >
        {[1, 2, 3].map((n) => (
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
              <legend className="text-lg">Who are you?</legend>
              <div className="mt-6 space-y-4">
                <Field label="Name" value={values.name} onChange={set("name")} required />
                <Field
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={set("email")}
                  required
                />
                <Field label="Company (optional)" value={values.company} onChange={set("company")} />
                <Field label="Your role (optional)" value={values.role} onChange={set("role")} />
              </div>
            </fieldset>
          </Reveal>
        ) : null}

        {step === 2 ? (
          <Reveal>
            <fieldset>
              <legend className="text-lg">What do you need?</legend>
              <div className="mt-6 space-y-4">
                <Select
                  label="Project type"
                  value={values.projectType}
                  onChange={set("projectType")}
                  options={PROJECT_TYPES}
                />
                <Select
                  label="Budget"
                  value={values.budget}
                  onChange={set("budget")}
                  options={BUDGETS}
                />
                <Select
                  label="Timeline"
                  value={values.timeline}
                  onChange={set("timeline")}
                  options={TIMELINES}
                />
              </div>
            </fieldset>
          </Reveal>
        ) : null}

        {step === 3 ? (
          <Reveal>
            <fieldset>
              <legend className="text-lg">Anything else?</legend>
              <div className="mt-6">
                <label htmlFor="message" className="text-sm text-secondary">
                  Tell me about the project
                </label>
                <textarea
                  id="message"
                  rows={6}
                  value={values.message}
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
                    const res = await fetch("/api/lead", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...values,
                        source: "start-form",
                        slideSignals: signals,
                      }),
                    });
                    if (!res.ok) throw new Error("Submit failed");
                    setSent(true);
                  }}
                />
              </div>
            </fieldset>
          </Reveal>
        ) : null}
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

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && !stepOneValid}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
          >
            Next
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
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
        onChange={(e) => onChange(e.target.value)}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-2.5 text-sm text-primary"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hairline mt-2 w-full rounded-lg bg-surface-1 px-4 py-2.5 text-sm text-primary"
      >
        <option value="">Choose one</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
