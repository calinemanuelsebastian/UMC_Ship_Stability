/** Initial transverse correction only. FSM already includes tank-liquid density (t·m). */
export function computeFreeSurfaceCorrection(displacementTonnes: number, vcg: number, freeSurfaceMomentTransverse: number) {
  if (!Number.isFinite(displacementTonnes) || displacementTonnes <= 0) throw new Error('Free-surface correction requires positive finite displacement.');
  if (!Number.isFinite(vcg)) throw new Error('Physical VCG must be finite.');
  if (!Number.isFinite(freeSurfaceMomentTransverse) || freeSurfaceMomentTransverse < 0) throw new Error('Transverse free-surface moment must be finite and non-negative.');
  const freeSurfaceCorrectionTransverse = freeSurfaceMomentTransverse / displacementTonnes;
  const virtualVcgTransverse = vcg + freeSurfaceCorrectionTransverse;
  if (![freeSurfaceCorrectionTransverse, virtualVcgTransverse].every(Number.isFinite)) throw new Error('Free-surface correction exceeds the supported numeric range.');
  return { freeSurfaceCorrectionTransverse, virtualVcgTransverse };
}
