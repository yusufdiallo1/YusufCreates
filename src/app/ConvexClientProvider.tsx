"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

/**
 * Convex client provider.
 *
 * The client is created once at module scope rather than per render, so a
 * re-render never tears down and re-opens the websocket.
 *
 * Before `npx convex dev` has provisioned a deployment there is no URL, and
 * constructing the client would throw and take the whole app down. In that
 * state the provider is a pass-through: the marketing site renders, and any
 * Convex-backed section is skipped by `isConvexConfigured`.
 */
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = url ? new ConvexReactClient(url) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>;

  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
