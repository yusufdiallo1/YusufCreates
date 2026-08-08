"use client";

import { useEntryState } from "@/components/providers/EntryStateProvider";

/**
 * ClosingBeats — pricing, objections and testimonials, in the order this
 * particular visitor needs them.
 *
 * A third visit is a different conversation from a first one. Somebody who has
 * come back twice is not still wondering whether the work is any good — they
 * have read that. They are stuck on something, and the thing they are stuck on
 * is an objection. So on visit three the FAQ comes up above the price, because
 * an unanswered doubt is what a price is being weighed against.
 *
 * REORDERED WITH CSS `order`, AND THAT IS THE WHOLE DESIGN.
 *
 * Entry state is client-only and resolves one commit after hydration. Sorting
 * an array of children, or rendering the sections in a different sequence,
 * would mean the server sent one DOM and the client immediately built another
 * — a hydration failure, and on a slow device a visible reshuffle of the page
 * under the reader's hands.
 *
 * `order` on a flex column changes only how boxes are PAINTED. The DOM order
 * never moves, so React sees exactly the tree it hydrated, and the server's
 * markup is correct for everyone before the state is even known. It is also
 * why this had to become a flex container rather than a plain fragment.
 *
 * The accessibility caveat is real and is why the reorder is limited to three
 * sibling landmark sections that each carry their own heading: tab order
 * follows the DOM, not `order`, so a keyboard user on visit three tabs through
 * pricing before the FAQ while seeing the reverse. Between three independent,
 * separately-headed sections that is a mild inconsistency. Doing it to
 * anything finer-grained — fields, buttons, links within a flow — would be a
 * genuine trap, so do not extend this pattern downward.
 */
export function ClosingBeats({
  pricing,
  objections,
  testimonials,
}: {
  pricing: React.ReactNode;
  objections: React.ReactNode;
  testimonials: React.ReactNode;
}) {
  /*
   * `returning` covers visit 2 upward, which is where this is worth doing.
   * The state carries no finer count by design — the journey record knows how
   * many visits there have been, but exposing that number to layout would
   * invite rules that differ between visit three and visit four, and nobody
   * can perceive that distinction.
   */
  const objectionsFirst = useEntryState() === "returning";

  return (
    <div className="flex flex-col">
      {/* DOM order is always pricing → objections → testimonials. Only the
          paint order changes, and only for a returning visitor. */}
      <div style={{ order: objectionsFirst ? 2 : 1 }}>{pricing}</div>
      <div style={{ order: objectionsFirst ? 1 : 2 }}>{objections}</div>
      <div style={{ order: 3 }}>{testimonials}</div>
    </div>
  );
}
