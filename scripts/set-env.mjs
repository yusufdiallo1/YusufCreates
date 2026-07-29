/**
 * Writes a value into .env.local without opening an editor.
 *
 *   node scripts/set-env.mjs STRIPE_SECRET_KEY sk_live_...
 *
 * Exists because editors silently fail to save dotfiles more often than you
 * would think — Cursor and VS Code both hide .env.local by default, and an
 * unsaved buffer looks identical to a saved one.
 *
 * Replaces the key in place if present, appends if not, and never prints the
 * value back.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const [key, ...rest] = process.argv.slice(2);
const value = rest.join(" ");

if (!key || !value) {
  console.error("Usage: node scripts/set-env.mjs KEY value");
  process.exit(1);
}

const path = ".env.local";
let text = existsSync(path) ? readFileSync(path, "utf8") : "";

const line = `${key}=${value}`;
const pattern = new RegExp(`^${key}=.*$`, "m");

text = pattern.test(text)
  ? text.replace(pattern, line)
  : text + (text.endsWith("\n") || text === "" ? "" : "\n") + line + "\n";

writeFileSync(path, text);

// Confirmed by re-reading, so a silent write failure cannot look like success.
const check = readFileSync(path, "utf8").match(pattern)?.[0] ?? "";
const stored = check.slice(key.length + 1);

console.log(
  stored === value
    ? `✓ ${key} written (${stored.length} chars, starts ${stored.slice(0, 8)}…)`
    : `✗ ${key} did NOT persist`,
);
