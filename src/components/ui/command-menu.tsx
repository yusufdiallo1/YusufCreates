"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";

/** ⌘K palette. Wire real actions into the item list as the app grows. */
export function CommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command menu">
      <Command.Input placeholder="Type a command or search…" />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => setOpen(false)}>Home</Command.Item>
          <Command.Item onSelect={() => setOpen(false)}>Pricing</Command.Item>
          <Command.Item onSelect={() => setOpen(false)}>Dashboard</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
