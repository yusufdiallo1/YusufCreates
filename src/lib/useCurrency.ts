"use client";

import { useEffect, useState } from "react";
import { CURRENCIES, type Currency } from "./pricing";

const KEY = "yc-currency";

/**
 * Selected currency, defaulting from the visitor's locale and persisting in
 * localStorage.
 *
 * Starts as USD on both server and first client paint so hydration matches,
 * then upgrades once localStorage and navigator.language are readable.
 */
export function useCurrency(): [Currency, (next: Currency) => void] {
  const [currency, setCurrency] = useState<Currency>("USD");

  useEffect(() => {
    /*
     * A stored choice, or USD.
     *
     * The locale used to decide this, which meant a visitor in Riyadh saw
     * SAR before being shown a single dollar figure — and every price on the
     * page is set in USD, with the others converted. Leading with the
     * currency the work is actually priced in is the honest default; the
     * toggle is right there for anyone who wants another.
     *
     * Checked against the list rather than a hardcoded set, so adding a
     * currency does not silently leave stored selections unrecognised.
     */
    const stored = localStorage.getItem(KEY) as Currency | null;
    const resolved = stored && CURRENCIES.includes(stored) ? stored : "USD";

    // Deferred to the next frame so the state update lands in a fresh commit
    // rather than cascading this one.
    const id = requestAnimationFrame(() => setCurrency(resolved));
    return () => cancelAnimationFrame(id);
  }, []);

  const update = (next: Currency) => {
    setCurrency(next);
    localStorage.setItem(KEY, next);
  };

  return [currency, update];
}
