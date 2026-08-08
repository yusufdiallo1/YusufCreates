"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Shared whiteboard.
 *
 * SYNCED OVER CONVEX, NOT OVER AGORA. Agora carries the media; the board is
 * project data. Putting it in the database means it is already authenticated
 * by the same session check as everything else, it needs no second SDK or
 * token, and — the part that actually matters — the board is still there when
 * someone opens the call notes next week. A board synced over a data channel
 * dies with the last participant.
 *
 * COORDINATES ARE NORMALISED to 0–1 before they are stored. Two people on a
 * laptop and a phone have different canvas sizes, and storing pixels would put
 * their strokes in visibly different places. Normalised, every stroke lands
 * where it was drawn relative to the board.
 *
 * ONE ROW PER STROKE, not per point. A point-per-row would be thousands of
 * writes for one sentence of handwriting, and undo would have no coherent unit
 * to remove.
 */

const COLOURS = [
  { name: "Ink", value: "#f7f8f8" },
  { name: "Accent", value: "#5e6ad2" },
  { name: "Warning", value: "#dba463" },
  { name: "Danger", value: "#e5484d" },
];

export function Whiteboard({
  callId,
  canClear,
}: {
  callId: Id<"calls">;
  /** Clearing destroys everyone's work, so only the admin gets the button. */
  canClear: boolean;
}) {
  const strokes = useQuery(api.calls.strokes, { callId });
  const addStroke = useMutation(api.calls.addStroke);
  const undoStroke = useMutation(api.calls.undoStroke);
  const clearBoard = useMutation(api.calls.clearBoard);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [colour, setColour] = useState(COLOURS[0].value);
  const [width, setWidth] = useState(3);

  /** The stroke being drawn right now, in normalised coordinates. */
  const drawing = useRef<number[]>([]);
  const isDown = useRef(false);

  /**
   * Repaints everything.
   *
   * Full redraw on every change rather than incremental drawing. At a few
   * hundred strokes this is imperceptible, and it removes a whole class of bug
   * where the local canvas and the stored board drift apart after an undo.
   */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const paint = (points: number[], stroke: string, lineWidth: number) => {
      if (points.length < 4) {
        // A tap, not a drag: render it as a dot so a single click still marks.
        if (points.length === 2) {
          ctx.beginPath();
          ctx.fillStyle = stroke;
          ctx.arc(points[0] * w, points[1] * h, lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.moveTo(points[0] * w, points[1] * h);
      for (let i = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i] * w, points[i + 1] * h);
      }
      ctx.stroke();
    };

    for (const s of strokes ?? []) paint(s.points, s.colour, s.width);
    // The in-progress stroke is painted last so it is never hidden behind a
    // stroke that arrives from the server mid-drag.
    if (drawing.current.length > 0) paint(drawing.current, colour, width);
  }, [strokes, colour, width]);

  /*
   * Size the backing store to the DISPLAYED size times the device pixel ratio.
   *
   * A canvas has two sizes — its CSS box and its bitmap — and if they disagree
   * the browser scales the bitmap, which makes every line soft. Matching them
   * against devicePixelRatio is what keeps strokes crisp on a retina screen.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
    ];
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Pen colour" className="flex gap-1.5">
          {COLOURS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColour(c.value)}
              aria-pressed={colour === c.value}
              aria-label={c.name}
              title={c.name}
              className="size-6 rounded-full border transition-transform duration-hover ease-hover hover:scale-110"
              style={{
                backgroundColor: c.value,
                borderColor:
                  colour === c.value ? "var(--text-primary)" : "var(--outline)",
              }}
            />
          ))}
        </div>

        <label htmlFor="pen-width" className="sr-only">
          Pen width
        </label>
        <input
          id="pen-width"
          type="range"
          min={1}
          max={12}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="glass-range w-24"
        />

        <button
          type="button"
          onClick={() => void undoStroke({ callId })}
          className="control-outline rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-secondary transition-colors duration-hover ease-hover hover:text-primary"
        >
          Undo mine
        </button>

        {canClear ? (
          <button
            type="button"
            onClick={() => void clearBoard({ callId })}
            className="control-outline rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-secondary transition-colors duration-hover ease-hover hover:text-[color:var(--danger)]"
          >
            Clear board
          </button>
        ) : null}
      </div>

      {/*
        touch-none is load-bearing: without it a drag on a phone scrolls the
        page instead of drawing, and the board is unusable on touch.
      */}
      <canvas
        ref={canvasRef}
        aria-label="Shared whiteboard"
        className="hairline aspect-[16/10] w-full touch-none rounded-[var(--radius-md)] bg-surface-1"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          isDown.current = true;
          drawing.current = pointFrom(e);
          redraw();
        }}
        onPointerMove={(e) => {
          if (!isDown.current) return;
          drawing.current.push(...pointFrom(e));
          redraw();
        }}
        onPointerUp={() => {
          if (!isDown.current) return;
          isDown.current = false;
          const points = drawing.current;
          drawing.current = [];
          if (points.length >= 2) {
            void addStroke({ callId, points, colour, width });
          }
          redraw();
        }}
        onPointerCancel={() => {
          // A cancelled pointer (a call, a gesture) must not leave a half
          // stroke on screen that nobody else can see.
          isDown.current = false;
          drawing.current = [];
          redraw();
        }}
      />
    </div>
  );
}
