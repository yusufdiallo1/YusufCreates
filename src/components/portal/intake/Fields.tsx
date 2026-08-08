"use client";

import { useId } from "react";
import type { Field } from "@convex/intakeSections";
import { Dropzone, type UploadedFile } from "@/components/portal/intake/Dropzone";
import { CredentialForm } from "@/components/portal/CredentialForm";

/**
 * One field of the intake form, by type.
 *
 * Every field here is optional. There is no required marker anywhere in this
 * file and that is deliberate — a blocked question must never block the whole
 * form. If someone cannot find their brand guidelines, the correct outcome is
 * that I get the other five sections today, not that I get nothing.
 *
 * Mobile-first throughout: 16px inputs (`text-base`) so iOS does not zoom the
 * viewport on focus, `min-h-11` targets, real `inputMode` and `autocomplete`
 * so a phone keyboard shows the right keys.
 */

const INPUT =
  "hairline min-h-11 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-base text-primary placeholder:text-secondary sm:text-sm";

export type FieldValue = unknown;

export function IntakeField({
  field,
  sectionId,
  token,
  value,
  onChange,
  files,
}: {
  field: Field;
  sectionId: string;
  token: string;
  value: FieldValue;
  onChange: (next: FieldValue) => void;
  files: UploadedFile[];
}) {
  const id = useId();
  const inputId = `${id}-${field.id}`;

  /*
   * The opt-out is rendered above the control and, when taken, replaces it.
   *
   * "I don't have any" is a real answer, not an absence of one — and leaving
   * the input visible underneath invites someone to tick the box and then
   * half-fill the field, which is two contradictory answers.
   */
  const optedOut =
    field.optOut !== undefined &&
    typeof value === "object" &&
    value !== null &&
    (value as { optOut?: boolean }).optOut === true;

  const optOutToggle = field.optOut ? (
    <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={optedOut}
        onChange={(e) => onChange(e.target.checked ? { optOut: true } : null)}
        className="size-4 accent-[color:var(--accent)]"
      />
      <span className="text-[13px] text-secondary">{field.optOut.label}</span>
    </label>
  ) : null;

  const body = () => {
    if (optedOut) return null;

    switch (field.type) {
      case "text":
      case "url":
        return (
          <input
            id={inputId}
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            inputMode={field.type === "url" ? "url" : undefined}
            autoCapitalize={field.type === "url" ? "none" : undefined}
            spellCheck={field.type === "url" ? false : undefined}
            className={INPUT}
          />
        );

      case "textarea":
        return (
          <textarea
            id={inputId}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`${INPUT} min-h-24`}
          />
        );

      case "choice":
        return (
          <div className="mt-2 flex flex-wrap gap-2">
            {field.choices?.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() =>
                  // Pressing the selected one again clears it. Radio groups
                  // are famously impossible to un-answer, and "I picked the
                  // wrong one and now it is stuck" is a real complaint.
                  onChange(value === choice.id ? null : choice.id)
                }
                aria-pressed={value === choice.id}
                className={`hairline min-h-11 rounded-full px-3.5 text-[13px] transition-colors duration-fast ${
                  value === choice.id
                    ? "bg-surface-2 text-primary"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>
        );

      case "colours":
        return <Colours value={value} onChange={onChange} />;

      case "adjectives":
        return <Adjectives value={value} onChange={onChange} />;

      case "references":
        return (
          <References
            value={value}
            onChange={onChange}
            count={field.count ?? 3}
          />
        );

      case "files":
        return (
          <Dropzone
            token={token}
            sectionId={sectionId}
            fieldId={field.id}
            label={field.multiple ? "Choose files" : "Choose a file"}
            accept={field.accept}
            multiple={field.multiple}
            files={files}
          />
        );

      case "credentials":
        return <CredentialForm token={token} className="mt-2" />;

      default:
        return null;
    }
  };

  const labelled = field.type !== "credentials" && field.type !== "files";

  return (
    <div>
      {labelled ? (
        <label htmlFor={inputId} className="text-sm text-primary">
          {field.label}
        </label>
      ) : (
        <p className="text-sm text-primary">{field.label}</p>
      )}

      {field.help ? (
        <p className="mt-1 text-xs leading-relaxed text-secondary">
          {field.help}
        </p>
      ) : null}

      {optOutToggle}

      <div className={field.type === "choice" ? "" : "mt-2"}>{body()}</div>
    </div>
  );
}

/* ==================================================================== *
 *  COMPOSITE FIELDS                                                    *
 * ==================================================================== */

/**
 * Hex inputs with live swatches.
 *
 * The swatch is the point. A hex code is unreadable — nobody looks at
 * #2E5C8A and knows whether they typed their blue or a slightly different
 * blue, and a wrong digit is invisible until it shows up in a design.
 */
function Colours({
  value,
  onChange,
}: {
  value: FieldValue;
  onChange: (next: FieldValue) => void;
}) {
  const colours: string[] = Array.isArray(value)
    ? (value as string[])
    : ["", "", ""];

  const set = (index: number, next: string) => {
    const copy = [...colours];
    copy[index] = next;
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      {colours.map((colour, index) => {
        const valid = /^#?[0-9a-fA-F]{6}$/.test(colour.trim());
        const swatch = valid
          ? colour.trim().startsWith("#")
            ? colour.trim()
            : `#${colour.trim()}`
          : null;

        return (
          <div key={index} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              style={swatch ? { backgroundColor: swatch } : undefined}
              className={`size-11 shrink-0 rounded-lg ${
                swatch ? "" : "hairline bg-surface-2"
              }`}
            />
            <input
              type="text"
              value={colour}
              onChange={(e) => set(index, e.target.value)}
              placeholder={index === 0 ? "#2E5C8A" : "Optional"}
              aria-label={`Brand colour ${index + 1}`}
              autoCapitalize="none"
              spellCheck={false}
              className={`${INPUT} font-mono`}
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...colours, ""])}
        className="min-h-11 text-xs text-secondary transition-colors duration-fast hover:text-primary"
      >
        Add another
      </button>
    </div>
  );
}

/** Exactly three adjectives, because the constraint is what makes it useful. */
function Adjectives({
  value,
  onChange,
}: {
  value: FieldValue;
  onChange: (next: FieldValue) => void;
}) {
  const words: string[] = Array.isArray(value)
    ? (value as string[])
    : ["", "", ""];

  const set = (index: number, next: string) => {
    const copy = [...words];
    copy[index] = next;
    onChange(copy);
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <input
          key={index}
          type="text"
          value={words[index] ?? ""}
          onChange={(e) => set(index, e.target.value)}
          placeholder={["warm", "plain", "unfussy"][index]}
          aria-label={`Adjective ${index + 1}`}
          className={INPUT}
        />
      ))}
    </div>
  );
}

/**
 * A URL and one line on why, repeated.
 *
 * The "why" is not optional padding — it is the entire value of the exercise.
 * Three URLs on their own tell me what they looked at; three URLs with "the
 * spacing feels expensive" tell me what to build.
 */
function References({
  value,
  onChange,
  count,
}: {
  value: FieldValue;
  onChange: (next: FieldValue) => void;
  count: number;
}) {
  const rows: { url: string; why: string }[] = Array.isArray(value)
    ? (value as { url: string; why: string }[])
    : Array.from({ length: count }, () => ({ url: "", why: "" }));

  const set = (index: number, key: "url" | "why", next: string) => {
    const copy = rows.map((r) => ({ ...r }));
    while (copy.length <= index) copy.push({ url: "", why: "" });
    copy[index][key] = next;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="hairline rounded-lg bg-surface-1 p-3">
          <input
            type="url"
            value={rows[index]?.url ?? ""}
            onChange={(e) => set(index, "url", e.target.value)}
            placeholder="example.com"
            aria-label={`Site ${index + 1} address`}
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            className="min-h-11 w-full bg-transparent text-base text-primary placeholder:text-secondary focus:outline-none sm:text-sm"
          />
          <input
            type="text"
            value={rows[index]?.why ?? ""}
            onChange={(e) => set(index, "why", e.target.value)}
            placeholder="…and one line on why"
            aria-label={`Site ${index + 1} reason`}
            className="min-h-11 w-full border-t border-[color:var(--border-hairline)] bg-transparent text-base text-secondary placeholder:text-secondary focus:text-primary focus:outline-none sm:text-sm"
          />
        </div>
      ))}
    </div>
  );
}
