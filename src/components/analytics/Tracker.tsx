"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/**
 * Records a pageview on mount and on every client-side navigation.
 *
 * The referrer is captured only on the first pageview of a session. Sending it
 * on every view would fill the table with same-origin referrers that say
 * nothing about where the visitor actually came from.
 */
export function Tracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;

    track("pageview", {
      path: pathname,
      referrer:
        isFirst && document.referrer && !document.referrer.includes(location.host)
          ? document.referrer
          : undefined,
    });
  }, [pathname]);

  return null;
}
