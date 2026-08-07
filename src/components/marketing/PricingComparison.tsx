"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion/Reveal";
import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  type ComparisonValue,
} from "@/lib/pricing";

/**
 * The comparison table.
 *
 * The tier cards above answer "what is this one?" — read one at a time, in
 * prose. This answers the different question people arrive with once they have
 * read two of them: what exactly do I lose by going down a tier. That is a
 * question about rows, and prose cannot hold a row.
 *
 * The matrix itself lives in lib/pricing.ts beside the cards it is checked
 * against. See COMPARISON_ROWS for why it is stated rather than derived from
 * the feature lists.
 *
 * HOVER HIGHLIGHTS THE WHOLE ROW, not the cell. A table this wide is read by
 * tracking a line across four columns, and the failure mode is losing that
 * line halfway — which is exactly what a per-cell hover encourages, because it
 * marks the thing you have already found rather than the thing you are looking
 * for.
 *
 * One delegated listener resolves the row from the event target. Twenty-three
 * rows times four columns is ninety-two cells, and ninety-two pairs of enter
 * and leave handlers is ninety-two closures re-created on every render to
 * answer a question the event itself already carries.
 */
export function PricingComparison() {
  const reduceMotion = useReducedMotion();
  const [row, setRow] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const resolveRow = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const cell = target.closest("td, th");
    const line = cell?.closest("tr");
    const index = line?.dataset.row;
    return index === undefined ? null : Number(index);
  };

  return (
    <section
      aria-labelledby="comparison-heading"
      className="mx-auto mt-20 max-w-5xl px-6"
    >
      <Reveal>
        <h2 id="comparison-heading" className="text-3xl">
          What is in each
        </h2>
        <p className="mt-3 max-w-prose text-sm text-secondary">
          iOS and macOS is not in this table. It is a second codebase alongside
          a site rather than a larger version of one, so a row-by-row reading
          against the others would be misleading.
        </p>
      </Reveal>

      {/* Scrolls sideways on a phone rather than shrinking to unreadable type.
          tabIndex and role make the scroll container reachable by keyboard,
          which is required of any scrollable region. */}
      <div
        className="scroll-row mt-8 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-labelledby="comparison-heading"
      >
        <table
          ref={tableRef}
          className="w-full min-w-[40rem] border-collapse text-left text-sm"
          onPointerOver={(e) => setRow(resolveRow(e.target))}
          onPointerLeave={() => setRow(null)}
          /* Focus moves through the table on a keyboard too, and the same
             tracking problem applies — more so, because a keyboard user cannot
             sweep their eye and their pointer together. */
          onFocusCapture={(e) => setRow(resolveRow(e.target))}
        >
          <thead>
            <tr>
              <th scope="col" className="w-2/5 pb-3 font-normal text-secondary">
                <span className="sr-only">Feature</span>
              </th>
              {COMPARISON_COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="pb-3 pl-4 font-normal text-primary"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {COMPARISON_ROWS.map((line, index) => (
              <tr
                key={line.label}
                data-row={index}
                className="border-t border-[color:var(--border-hairline)] transition-colors duration-hover ease-hover"
                style={
                  row === index
                    ? { backgroundColor: "var(--bg-surface-2)" }
                    : undefined
                }
              >
                <th
                  scope="row"
                  className="py-3 pr-4 font-normal text-secondary"
                >
                  {line.label}
                </th>
                {line.values.map((value, column) => (
                  <td key={column} className="py-3 pl-4">
                    <Cell
                      value={value}
                      pulse={row === index && !reduceMotion}
                      column={column}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * One cell.
 *
 * The checkmark pulses once when its row is highlighted — a single beat at
 * 1.15, not a loop. Twenty-three rows of anything that repeats would be a
 * strobe, and the pulse is there to confirm which row you landed on, which
 * only needs saying once.
 *
 * A dash rather than a cross for absence. A cross reads as a failure; this is
 * a smaller plan not doing something a larger one does, which is the deal, not
 * a fault.
 */
function Cell({
  value,
  pulse,
  column,
}: {
  value: ComparisonValue;
  pulse: boolean;
  column: number;
}) {
  if (typeof value === "string") {
    return <span className="text-primary">{value}</span>;
  }

  if (!value) {
    return (
      <span className="text-secondary opacity-50" aria-label="Not included">
        <span aria-hidden="true">—</span>
      </span>
    );
  }

  return (
    <motion.span
      className="inline-block text-accent"
      aria-label="Included"
      animate={{ scale: pulse ? [1, 1.15, 1] : 1 }}
      transition={{
        duration: 0.3,
        // A few milliseconds apart across the row, so the confirmation reads
        // as travelling along the line the reader is following rather than as
        // four things blinking at once.
        delay: pulse ? column * 0.04 : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path d="M3 8.5 L6.5 12 L13 4.5" strokeLinecap="square" />
      </svg>
    </motion.span>
  );
}
