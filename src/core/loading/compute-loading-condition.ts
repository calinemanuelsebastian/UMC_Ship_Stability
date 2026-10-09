import { computeFreeSurfaceCorrection } from './free-surface-correction';
import type { LoadingResult, LoadingWeight } from '../domain/loading-condition';

export function computeLoadingCondition(weights: readonly LoadingWeight[]): LoadingResult {
  let displacementTonnes = 0;
  let freeSurfaceMomentTransverse = 0;
  let longitudinalMoment = 0;
  let verticalMoment = 0;
  let transverseMoment = 0;
  for (const weight of weights) {
    if (![weight.massTonnes, weight.lcg, weight.vcg, weight.tcg].every(Number.isFinite)) {
      throw new Error(`${weight.name || 'Weight'}: enter finite mass and coordinates.`);
    }
    if (weight.massTonnes < 0) throw new Error('Weight masses cannot be negative.');
    const moment = weight.freeSurfaceMomentTransverse ?? 0;
    if (!Number.isFinite(moment) || moment < 0) throw new Error('Transverse free-surface moments must be finite and non-negative.');
    freeSurfaceMomentTransverse += moment;
    displacementTonnes += weight.massTonnes;
    longitudinalMoment += weight.massTonnes * weight.lcg;
    verticalMoment += weight.massTonnes * weight.vcg;
    transverseMoment += weight.massTonnes * weight.tcg;
  }
  if (displacementTonnes <= 0) throw new Error('Add weights with a positive total mass to calculate centres.');
  const lcg = longitudinalMoment / displacementTonnes;
  const vcg = verticalMoment / displacementTonnes;
  const tcg = transverseMoment / displacementTonnes;
  if (![displacementTonnes, longitudinalMoment, verticalMoment, transverseMoment, lcg, vcg, tcg].every(Number.isFinite)) {
    throw new Error('The entered weights or moments exceed the supported numeric range.');
  }
  const correction = computeFreeSurfaceCorrection(displacementTonnes, vcg, freeSurfaceMomentTransverse);
  return { ...correction, freeSurfaceMomentTransverse, displacementTonnes, longitudinalMoment, verticalMoment, transverseMoment, lcg, vcg, tcg };
}
