"use client";

import { useEffect, useState } from "react";
import { FieldError } from "@/components/ui/FieldError";

/**
 * Phone input with a country-code picker.
 *
 * "Include the country code" was a plain text field, which meant every answer
 * arrived in a different shape — some with +, some with 00, some with none at
 * all, and a browser autofill suggestion list covering the helper text.
 *
 * The dial code is chosen, so what gets stored is always +<code><number>.
 *
 * The default comes from the browser's own locale rather than an IP lookup: it
 * needs no third-party request, no consent question, and it is right far more
 * often than not. It is only a default — the picker is right there.
 */

/**
 * Dial codes, most-likely first for this business, then alphabetical.
 * Not the full ITU list: a 240-row select is worse to use than a short one
 * that covers where the enquiries actually come from, and "Other" is
 * unnecessary because anyone can still type their number in full.
 */
const COUNTRIES = [
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "PK", name: "Pakistan", dial: "+92" },
  { iso: "RU", name: "Russia", dial: "+7" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "TR", name: "Türkiye", dial: "+90" },
  { iso: "ZA", name: "South Africa", dial: "+27" },
];

const FALLBACK = COUNTRIES[0];

/** Region from the browser locale — "en-GB" → GB. */
function detectIso(): string | null {
  try {
    const locale = new Intl.Locale(navigator.language);
    // maximize() fills in the region for a bare language tag like "en",
    // which is what most browsers actually report.
    const region = locale.maximize().region;
    return region ?? null;
  } catch {
    return null;
  }
}

/** Splits a stored "+966 5..." back into a dial code and the rest. */
function split(value: string): { dial: string | null; rest: string } {
  const trimmed = value.trim();
  if (!trimmed.startsWith("+")) return { dial: null, rest: trimmed };

  // Longest match first, so +971 is not read as +97.
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => trimmed.startsWith(c.dial));

  return match
    ? { dial: match.dial, rest: trimmed.slice(match.dial.length).trim() }
    : { dial: null, rest: trimmed };
}

export function PhoneField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  required?: boolean;
  help?: string;
}) {
  const existing = split(value);
  const [dial, setDial] = useState(existing.dial ?? FALLBACK.dial);
  const [touchedDial, setTouchedDial] = useState(false);

  /*
   * Detected after hydration. navigator.language does not exist on the server,
   * so reading it during render would make the two passes disagree.
   *
   * Skipped once the visitor has picked one themselves, so a detection that
   * arrives late cannot overwrite a deliberate choice.
   */
  useEffect(() => {
    if (touchedDial || existing.dial) return;
    const iso = detectIso();
    const found = iso ? COUNTRIES.find((c) => c.iso === iso) : null;
    if (found) setDial(found.dial);
  }, [touchedDial, existing.dial]);

  const number = existing.rest;

  const emit = (nextDial: string, nextNumber: string) => {
    const cleaned = nextNumber.replace(/[^\d\s-]/g, "").trim();
    onChange(cleaned ? `${nextDial} ${cleaned}` : "");
  };

  return (
    <div>
      <label htmlFor={id} className="text-sm text-secondary">
        {label}
      </label>

      <div className="mt-2 flex gap-2">
        <select
          aria-label="Country dialling code"
          value={dial}
          onChange={(e) => {
            setTouchedDial(true);
            setDial(e.target.value);
            emit(e.target.value, number);
          }}
          className="hairline w-[7.5rem] shrink-0 rounded-lg bg-surface-1 px-2.5 py-3 text-sm text-primary"
        >
          {COUNTRIES.map((c) => (
            // Key on iso, not dial: +1 is both US and Canada, and duplicate
            // keys would drop one of them.
            <option key={c.iso} value={c.dial}>
              {c.iso} {c.dial}
            </option>
          ))}
        </select>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="5X XXX XXXX"
          value={number}
          aria-invalid={error ? true : undefined}
          required={required}
          onChange={(e) => emit(dial, e.target.value)}
          onBlur={onBlur}
          className="hairline w-full rounded-lg bg-surface-1 px-4 py-3 text-sm text-primary placeholder:text-secondary"
        />
      </div>

      {help ? <p className="mt-1.5 text-xs text-secondary">{help}</p> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}
