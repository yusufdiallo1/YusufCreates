#!/usr/bin/env node
/**
 * Secret leak guard.
 *
 * Scans the built client bundle and all git-tracked files for credential
 * patterns. Server-only env vars must never reach `.next/static` — anything
 * there is downloaded by every visitor.
 *
 * Run after a build, or in CI before deploying. Exits non-zero on a hit.
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PATTERNS = [
  { name: "Stripe secret key", re: /sk_(live|test)_[A-Za-z0-9]{20,}/ },
  { name: "Stripe restricted key", re: /rk_(live|test)_[A-Za-z0-9]{20,}/ },
  { name: "Resend API key", re: /\bre_[A-Za-z0-9_]{20,}/ },
  { name: "Groq API key", re: /\bgsk_[A-Za-z0-9]{20,}/ },
  { name: "Anthropic API key", re: /sk-ant-[A-Za-z0-9-]{20,}/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "Convex deploy key", re: /\bprod:[A-Za-z0-9-]+\|[A-Za-z0-9]{20,}/ },
];

let failures = 0;

function scan(content, label) {
  for (const { name, re } of PATTERNS) {
    const hit = content.match(re);
    if (hit) {
      // Print only a prefix — never echo a full credential.
      console.error(
        `LEAK  ${name} in ${label}\n      matched: ${hit[0].slice(0, 12)}…`,
      );
      failures += 1;
    }
  }
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(js|mjs|css|json|html|map)$/.test(entry)) {
      scan(readFileSync(full, "utf8"), full);
    }
  }
}

// 1. Client bundle — the highest-risk surface.
walk(".next/static");

// 2. Git-tracked files — anything committed is public the moment you push.
try {
  const tracked = execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  for (const file of tracked) {
    try {
      scan(readFileSync(file, "utf8"), file);
    } catch {
      // Binary or unreadable; skip.
    }
  }
} catch {
  console.warn("(not a git repository — skipped tracked-file scan)");
}

if (failures > 0) {
  console.error(`\n${failures} secret leak(s) found. Build must not ship.`);
  process.exit(1);
}
console.log("No secrets found in client bundle or tracked files.");
