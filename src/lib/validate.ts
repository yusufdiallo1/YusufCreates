/**
 * Validation messages.
 *
 * One place, so every form says the same thing the same way. The wording is
 * the point: each message describes what to do next rather than naming a
 * failure. "Please fill out this field" tells someone nothing they did not
 * already know.
 *
 * Returning null means valid, which lets callers write `const err = email(v)`
 * and treat it as both a check and a message.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (v === "") return "I'll need an email address to reply to.";
  // A missing @ is the common typo and worth naming precisely; anything else
  // gets the general message rather than a lecture about RFC formats.
  if (!v.includes("@")) return "That's missing an @ — did you mean to finish it?";
  if (!EMAIL_RE.test(v)) return "That address doesn't look complete yet.";
  return null;
}

export function validateRequired(value: string, what: string): string | null {
  return value.trim() === "" ? `Could you add ${what}?` : null;
}

export function validatePhone(value: string, required: boolean): string | null {
  const v = value.trim();
  if (v === "") {
    return required
      ? "A number helps if you'd rather I call — or switch back to email."
      : null;
  }
  // Deliberately permissive. Phone formats vary wildly by country and a strict
  // pattern rejects more real numbers than fake ones; this only catches input
  // too short to be any number at all.
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length < 6) return "That looks a little short for a phone number.";
  return null;
}

export function validateUrl(value: string): string | null {
  const v = value.trim();
  if (v === "") return null;
  try {
    const url = new URL(v.startsWith("http") ? v : `https://${v}`);
    return url.hostname.includes(".") ? null : "That doesn't look like a web address.";
  } catch {
    return "That doesn't look like a web address.";
  }
}
