"use client";

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
  const entries = useQuery(
    api.kb.list,
    isConvexConfigured ? {} : "skip",
  );

  if (!isConvexConfigured) return null;

  const suggestions = (entries ?? [])
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
    .map((e) => e.question);

  return <ChatPanel suggestions={suggestions} />;
}
