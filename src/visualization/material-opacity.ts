import type { Material } from 'three';

/** Smooth alpha blending for see-through surfaces; solid surfaces occlude normally.
 * Alpha hashing needs temporal accumulation, which our on-demand renderer does not
 * provide. Disable it explicitly, including on materials loaded from a model.
 * Visibility at zero opacity is handled by the owning mesh/group.
 */
export function setSurfaceOpacity(material: Material, opacity: number) {
  if (!Number.isFinite(opacity)) throw new Error('Surface opacity must be finite.');
  const value = Math.max(0, Math.min(1, opacity));
  const transparent = value < 1;
  const changed = material.transparent !== transparent || material.alphaHash;
  material.alphaHash = false;
  material.transparent = transparent;
  material.depthWrite = !transparent;
  material.opacity = value;
  if (changed) material.needsUpdate = true;
}

/** Panels use the same smooth blending as the hull, without stippled coverage. */
export function setPanelOpacity(material: Material, opacity: number) {
  setSurfaceOpacity(material, opacity);
}
