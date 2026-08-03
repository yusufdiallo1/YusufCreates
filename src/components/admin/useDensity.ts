"use client";

import { useEffect, useState } from "react";

/**
 * Row density for the admin, persisted per admin.
 *
 * Two values only. A slider would imply the spacing is continuous; it is not
 * — 44px is the comfortable touch target and 36px is as tight as a row can be
 * and still be clickable with a mouse. Anything between is a worse version of
 * one of them.
 *
 * The value is written to a data attribute on the shell rather than threaded
 * through every component, so a row only has to read var(--row-h) and nothing
 * needs to know the toggle exists.
 */

const KEY = "yc.admin.density";

export type Density = "comfortable" | "compact";

export function useDensity(): [Density, (next: Density) => void] {
  /*
   * Starts comfortable on both server and client.
   *
   * localStorage cannot be read during render — the server has no access to
   * it, so a stored "compact" would produce markup the client immediately
   * contradicts, and React would throw away the tree. The stored value is
   * adopted in an effect instead, one frame later, which is invisible for a
   * change that only alters row height.
   */
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === "compact" || stored === "comfortable") setDensity(stored);
    } catch {
      // Private browsing refuses storage. The default is a fine answer.
    }
  }, []);

  const update = (next: Density) => {
    setDensity(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Not persisting is survivable; failing to switch would not be.
    }
  };

  return [density, update];
}
