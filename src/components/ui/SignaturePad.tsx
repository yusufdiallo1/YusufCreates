"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Draw-your-signature canvas.
 *
 * Pointer events rather than separate mouse and touch handlers — one code path
 * covers a trackpad, a finger and a stylus, and setPointerCapture keeps the
 * stroke attached when the pointer leaves the canvas mid-drag, which is how
 * most signatures end.
 *
 * Backed by a fixed-resolution bitmap scaled to the element, so the exported
 * PNG is the same size whatever the display and whatever the device pixel
 * ratio. A signature that comes out at a different resolution on every phone
 * is a signature that looks tampered with when you line two of them up.
 *
 * The image is evidence but it is NOT the thing that makes the signature hold
 * — that is the consent record, the typed name, and the hash chain around
 * them. A drawn squiggle proves very little on its own, which is why this
 * component can be left blank without blocking signing.
 */

const WIDTH = 800;
const HEIGHT = 240;

export function SignaturePad({
  onChange,
  disabled,
}: {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const context = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Explicit rather than inherited: canvas defaults to black, but the admin
    // and the client may be in different themes and the stored PNG has to be
    // legible on the white page of a PDF either way.
    ctx.strokeStyle = "#111111";
    return ctx;
  }, []);

  useEffect(() => {
    const ctx = context();
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
  }, [context]);

  function positionOf(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Map CSS pixels onto the fixed bitmap, so the stroke lands where the
    // pointer is regardless of how the canvas has been scaled by layout.
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    last.current = positionOf(event);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const ctx = context();
    const from = last.current;
    if (!ctx || !from) return;

    const to = positionOf(event);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    last.current = to;

    if (!hasInk) setHasInk(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const canvas = canvasRef.current;
    if (canvas && hasInk) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const ctx = context();
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    setHasInk(false);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Draw your signature"
        role="img"
        className="hairline h-40 w-full touch-none rounded-lg bg-white"
        style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-secondary">
          Draw your signature above. Optional.
        </p>
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk || disabled}
          className="text-xs text-accent hover:text-primary disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
