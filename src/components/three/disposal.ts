import type * as THREE from "three";

/**
 * Releasing a WebGL context properly.
 *
 * React Three Fiber cleans up objects it created inside the React tree, but it
 * does NOT free the GL context, and anything made imperatively — in a useMemo,
 * a loader, an effect — is invisible to it. Browsers allow roughly sixteen
 * live contexts and silently kill the OLDEST past that limit, so a leak here
 * does not fail where it happened: an unrelated scene elsewhere on the site
 * turns black with no error anyone will connect to this.
 *
 * The order below matters, and each step exists because skipping it breaks
 * something specific.
 */

function disposeMaterial(material: THREE.Material): void {
  /*
   * material.dispose() does NOT dispose its textures — they are shared by
   * design, so three leaves that decision to the caller. Walking the material
   * for texture-shaped values and disposing them is the only way to get the
   * GPU memory back.
   */
  for (const value of Object.values(material)) {
    if (
      value &&
      typeof value === "object" &&
      "isTexture" in value &&
      typeof (value as THREE.Texture).dispose === "function"
    ) {
      (value as THREE.Texture).dispose();
    }
  }
  material.dispose();
}

/**
 * Tear a scene down and hand the GPU context back.
 *
 * Only call this for assets the scene OWNS. A texture shared with another
 * scene, or one held in a loader's global cache, must not be disposed here —
 * the cache would keep serving the disposed object and the next mount would
 * render black.
 */
export function disposeScene(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
): void {
  // 1. Stop rendering FIRST. Disposing resources that a queued frame still
  //    references produces GL errors, and on some drivers a crash.
  renderer.setAnimationLoop(null);

  // 2. Leaves before the things holding them.
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
  });

  // 3. Detach everything, so no JS reference keeps the graph alive.
  scene.clear();

  // 4. Cached programs and render targets.
  renderer.renderLists?.dispose?.();
  renderer.dispose();

  /*
   * 5. THE STEP THAT ACTUALLY FREES THE CONTEXT.
   *
   * renderer.dispose() releases three's own resources but leaves the WebGL
   * context live and counting against the browser's limit. Omitting
   * forceContextLoss is the single most common cause of "too many active
   * WebGL contexts", and the symptom appears somewhere else entirely.
   */
  renderer.forceContextLoss();

  // 6. Safari in particular keeps the context reachable through the canvas
  //    element, so drop the reference.
  (renderer as unknown as { domElement: HTMLCanvasElement | null }).domElement =
    null;
}
