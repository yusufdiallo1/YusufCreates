"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "motion/react";
import { cn } from "@/lib/utils";
import { useCapability } from "@/components/providers/CapabilityProvider";
import { acquireContext, releaseContext } from "@/lib/webgl-budget";

/**
 * SceneHost — mounts the 3D scene only when it is worth having.
 *
 * The scene is roughly 600KB and costs a WebGL context, so it earns its place
 * on strict conditions: full tier only, below the fold only, near the viewport
 * only, within the context budget, and never on the hero.
 *
 * THE DYNAMIC IMPORT IS AT MODULE SCOPE. Calling dynamic() inside a render
 * body creates a NEW component type on every render, which unmounts and
 * remounts the canvas — and therefore destroys and recreates a WebGL context —
 * on every parent update. That is the most expensive possible way to get this
 * wrong, and it looks like it works.
 *
 * THE GATE IS ASYMMETRIC. Mounting at 200px and unmounting at 600px, with a
 * one-second delay on the unmount. Context creation costs 50–200ms of main
 * thread, so churning at a symmetric boundary is far worse than holding a
 * context slightly too long.
 *
 * Everything else gets the static image, which is also what is in the SSR
 * payload — can3D is false at the server tier, so no scene is ever server
 * rendered.
 */

// Module scope. See the note above; this must not move into the component.
const Scene = dynamic(() => import("./GlassObject"), {
  ssr: false,
  loading: () => null,
});

const MOUNT_MARGIN = "200px";
const UNMOUNT_MARGIN = "600px";
const UNMOUNT_DELAY_MS = 1000;

export interface SceneHostProps {
  /** Rendered whenever the scene is not. Must be the SEO-visible content. */
  fallback: React.ReactNode;
  className?: string;
}

export function SceneHost({ fallback, className }: SceneHostProps) {
  const host = useRef<HTMLDivElement>(null);
  const { can3D } = useCapability();
  const [mounted, setMounted] = useState(false);
  const [lost, setLost] = useState(false);

  /* Scroll progress lives in a ref, never in state: state would re-render the
     canvas tree every frame and defeat frameloop="demand" entirely. */
  const progress = useRef(0);
  const { scrollYProgress } = useScroll({
    target: host,
    offset: ["start end", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progress.current = v;
  });

  useEffect(() => {
    if (!can3D || lost) return;
    const node = host.current;
    if (!node) return;

    let unmountTimer: ReturnType<typeof setTimeout> | undefined;
    let holdsContext = false;

    const mountObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        clearTimeout(unmountTimer);
        if (holdsContext) return;
        // Refused means something else leaked; fall back rather than push the
        // browser past its limit and blank an unrelated canvas.
        if (!acquireContext()) return;
        holdsContext = true;
        setMounted(true);
      },
      { rootMargin: MOUNT_MARGIN },
    );

    const unmountObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) return;
        clearTimeout(unmountTimer);
        unmountTimer = setTimeout(() => {
          setMounted(false);
          if (holdsContext) {
            releaseContext();
            holdsContext = false;
          }
        }, UNMOUNT_DELAY_MS);
      },
      { rootMargin: UNMOUNT_MARGIN },
    );

    mountObserver.observe(node);
    unmountObserver.observe(node);

    return () => {
      clearTimeout(unmountTimer);
      mountObserver.disconnect();
      unmountObserver.disconnect();
      if (holdsContext) releaseContext();
    };
  }, [can3D, lost]);

  /* A lost context leaves the canvas permanently blank with no error. Without
     a handler the section just goes empty and nothing says why. */
  useEffect(() => {
    if (!mounted) return;
    const node = host.current;
    const canvas = node?.querySelector("canvas");
    if (!canvas) return;
    const onLost = (event: Event) => {
      event.preventDefault();
      setLost(true);
      setMounted(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [mounted]);

  return (
    <div
      ref={host}
      /* Fixed aspect ratio so mounting never changes document height. That
         avoids a ScrollTrigger refresh and a CLS penalty for free. */
      className={cn("relative aspect-[16/9] w-full", className)}
      aria-hidden="true"
    >
      {mounted && can3D && !lost ? (
        <Scene progressRef={progress} />
      ) : (
        fallback
      )}
    </div>
  );
}
