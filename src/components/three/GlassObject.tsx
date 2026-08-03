"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial } from "@react-three/drei";
import type * as THREE from "three";
import { disposeScene } from "./disposal";

/**
 * A real refracting solid.
 *
 * The one effect on this site that CSS genuinely cannot do: light bending
 * through a volume, with chromatic dispersion at the edges, rather than a
 * blur pretending to be glass. It sits behind the Enterprise band, which is
 * where the material metaphor earns its cost.
 *
 * Every performance decision here is deliberate:
 *
 *   frameloop="demand" — the scene renders only when something asks it to.
 *   A continuously rendering canvas for a slowly turning object is pure
 *   waste, and this is most of the saving.
 *
 *   dpr capped at 1.5 — never 2 for a transmission material. Transmission
 *   re-renders the scene into a buffer to refract it, so pixel cost is paid
 *   twice and device pixel ratio squares it.
 *
 *   samples 6, not 16 — the cost is linear in samples and the visual
 *   difference above about six is not perceptible at this size.
 */

export interface GlassObjectProps {
  /** 0..1 scroll position through the host section, read via ref. */
  progressRef: React.RefObject<number>;
}

export default function GlassObject({ progressRef }: GlassObjectProps) {
  return (
    <Canvas
      // Renders on request rather than every frame. See above.
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
    >
      <Disposer />
      <Spinner progressRef={progressRef} />

      {/*
       * An environment is not decoration here — a transmission material with
       * nothing to refract renders flat grey.
       *
       * Built from geometry rather than loaded from an .hdr. drei's `preset`
       * fetches from a third-party CDN that this site's CSP does not allow and
       * that pmndrs themselves document as unfit for production; a self-hosted
       * file would mean carrying a multi-megabyte binary for something the
       * viewer only ever sees smeared through a torus.
       *
       * Four emissive planes in the site's own colours give the solid
       * something to bend, and the highlights that result agree with the warm
       * and cool point lights below.
       */}
      <Environment resolution={256}>
        <Lightformers />
      </Environment>

      {/* Warm and cool, positioned to agree with the section's ambient glow
          so the solid and the flat glass around it are lit from one place. */}
      <pointLight position={[4, 3, 4]} intensity={18} color="#ffd9b0" />
      <pointLight position={[-4, -2, 3]} intensity={12} color="#9fb4ff" />
    </Canvas>
  );
}

/**
 * The environment, as geometry.
 *
 * Emissive planes arranged around the subject. What a transmission material
 * needs is something with structure to refract — bright shapes against dark
 * gaps — and that is cheaper to build than to download. Colours are the
 * site's own, so the refraction reads as part of the page rather than as a
 * photograph of somebody's studio.
 */
function Lightformers() {
  return (
    <group>
      {/* Key, warm, upper right — agrees with the warm point light. */}
      <mesh position={[3.5, 2.5, 1]} rotation={[0, -Math.PI / 4, 0]}>
        <planeGeometry args={[4, 6]} />
        <meshBasicMaterial color="#ffd9b0" toneMapped={false} />
      </mesh>

      {/* Fill, cool, lower left. */}
      <mesh position={[-3.5, -1.5, 1]} rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[3, 5]} />
        <meshBasicMaterial color="#9fb4ff" toneMapped={false} />
      </mesh>

      {/* Rim, behind, so the edges catch. */}
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial color="#5e6ad2" toneMapped={false} />
      </mesh>

      {/* Overhead strip — the moving highlight across the top of the form. */}
      <mesh position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 2]} />
        <meshBasicMaterial color="#fffcf8" toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Frees the GL context on unmount.
 *
 * Lives inside the Canvas because that is the only place with access to the
 * renderer. The renderer and scene are held in a ref so the cleanup closure
 * sees the current pair rather than whichever ones existed when the effect
 * first ran — see disposal.ts for why each step of the teardown is required.
 */
function Disposer() {
  const gl = useThree((s: RootState) => s.gl);
  const scene = useThree((s: RootState) => s.scene);

  const latest = useRef({ gl, scene });

  // Kept current in an effect rather than during render: a render can be
  // abandoned under concurrent rendering, and a ref written there would then
  // point at a renderer that was never committed.
  useEffect(() => {
    latest.current = { gl, scene };
  }, [gl, scene]);

  useEffect(() => {
    // Nothing to set up. The cleanup is the entire point — R3F unmounts its
    // own objects but never frees the GL context. See disposal.ts.
    return () => {
      disposeScene(latest.current.gl, latest.current.scene);
    };
  }, []);

  return null;
}

/**
 * The solid itself.
 *
 * Reads scroll from a REF, never from React state: state would re-render the
 * whole canvas tree on every scroll frame, which is exactly the cost
 * frameloop="demand" exists to avoid.
 */
function Spinner({ progressRef }: { progressRef: React.RefObject<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s: RootState) => s.invalidate);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;

    const p = progressRef.current ?? 0;
    const targetY = p * Math.PI * 2;
    const targetX = Math.sin(p * Math.PI * 2) * 0.35;
    const targetZ = -1 + Math.sin(p * Math.PI) * 1.4;

    // Lerped rather than set, so the object carries inertia instead of
    // tracking the scrollbar exactly.
    const LERP = 0.08;
    m.rotation.y += (targetY - m.rotation.y) * LERP;
    m.rotation.x += (targetX - m.rotation.x) * LERP;
    m.position.z += (targetZ - m.position.z) * LERP;

    // Still settling: ask for another frame. Once it has arrived, stop.
    if (
      Math.abs(targetY - m.rotation.y) > 0.001 ||
      Math.abs(targetZ - m.position.z) > 0.001
    ) {
      invalidate();
    }
  });

  return (
    <mesh ref={mesh}>
      <torusGeometry args={[1.1, 0.42, 32, 96]} />
      <MeshTransmissionMaterial
        transmission={1}
        thickness={0.6}
        roughness={0.08}
        ior={1.5}
        chromaticAberration={0.05}
        backside
        samples={6}
        resolution={512}
      />
    </mesh>
  );
}
