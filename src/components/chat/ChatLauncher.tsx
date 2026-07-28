"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api, isConvexConfigured } from "@/lib/convex-api";
import { ChatPanel } from "@/components/chat/ChatPanel";

/**
 * Mounts the assistant with opening suggestions pulled from the knowledge
 * base, highest priority first.
 *
 * Renders nothing when Convex is unconfigured — an assistant with no
 * knowledge would answer everything with "I don't have that detail", which is
 * worse than no assistant at all.
 */
export function ChatLauncher() {
  // Held back until the page has settled. The pill is a blurred layer, and
  // mounting it during load makes the compositor blur a backdrop that is
  // still painting — measurably delaying LCP on a throttled phone for a
  // control nobody uses in the first second.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // A plain timeout rather than requestIdleCallback: Safari still does not
    // support it, and two seconds is well past LCP on any device while being
    // long before anyone reaches for a chat widget.
    const id = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(id);
  }, []);

  const entries = useQuery(
    api.kb.list,
    isConvexConfigured && ready ? {} : "skip",
  );

  if (!isConvexConfigured || !ready) return null;

  const suggestions = (entries ?? [])
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
    .map((e) => e.question);

  return <ChatPanel suggestions={suggestions} />;
}
