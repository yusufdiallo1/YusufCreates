"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * A centred modal on a blurred backdrop.
 *
 * Radix rather than a hand-rolled dialog: focus trapping, restoring focus to
 * the trigger, Escape, scroll locking and aria wiring are all things this
 * codebase would otherwise reimplement per modal and get subtly wrong once.
 *
 * The panel is solid, not glass. A translucent panel over a blurred page
 * leaves the text behind it faintly legible through the content, which is
 * fine for a floating pill and not fine for something asking to be read.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          // forceMount hands the exit animation to AnimatePresence; without it
          // Radix unmounts immediately and the panel vanishes rather than
          // leaving.
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.25, ease: EASE }}
                className="fixed inset-0 z-50 bg-[color:var(--bg-canvas)]/70 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 12, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 12, scale: 0.98 }
                }
                transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: EASE }}
                /* max-h with overflow: a long form on a short phone must
                   scroll inside the panel rather than off the screen. */
                className="fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-[color:var(--border-hairline)] bg-surface-1 p-6 shadow-2xl"
              >
                <Dialog.Title className="text-lg text-primary">
                  {title}
                </Dialog.Title>

                {description ? (
                  <Dialog.Description className="mt-1.5 text-sm text-secondary">
                    {description}
                  </Dialog.Description>
                ) : (
                  // Radix warns when Content has no Description. Hidden rather
                  // than omitted so the dialog still announces itself.
                  <Dialog.Description className="sr-only">
                    {title}
                  </Dialog.Description>
                )}

                <div className="mt-5">{children}</div>

                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full text-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-primary"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
