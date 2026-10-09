import {sharedResults,normalizedCondition} from '../calculations/shared-results';
import type { ShipModelPackage, SimulationCondition } from '../domain/ship-model';
import { computeUprightHydrostatics } from '../hydrostatics/compute-upright-hydrostatics';

export type TrimInputs = { freeSurfaceMomentLongitudinal: number };
export type TrimResult = Awaited<ReturnType<typeof computeTrimEquilibrium>>;
/** First-order, even-keel hydrostatics about LCF. All signed results are bow-positive. */
async function calculateTrimEquilibrium(ship: ShipModelPackage, condition: SimulationCondition, inputs: TrimInputs) {
  const resource = ship.manifest.resources.find(item => item.kind === 'trim.linear-equilibrium');
  const maxTrimDeg = resource?.config?.maxTrimDeg;
  if (typeof maxTrimDeg !== 'number' || !Number.isFinite(maxTrimDeg) || maxTrimDeg <= 0 || maxTrimDeg > 1) throw new Error('Trim requires a model limit greater than zero and no more than 1 degree.');
  const { lbp, mouldedDepth } = ship.manifest.principalDimensions;
  const { longitudinalOriginFromAP: originAP, xPositive } = ship.manifest.coordinateSystem;
  if (!Number.isFinite(lbp) || lbp <= 0 || mouldedDepth === undefined || !Number.isFinite(mouldedDepth) || mouldedDepth <= 0 || originAP === undefined || !Number.isFinite(originAP)) throw new Error('Trim requires positive LBP and depth, and an explicit origin position forward of AP.');
  if (condition.draft !== undefined || condition.displacementTonnes === undefined || !Number.isFinite(condition.displacementTonnes) || condition.displacementTonnes <= 0) throw new Error('Trim requires positive displacement without a draft input.');
  if (condition.tcg !== 0 || (condition.heelDeg ?? 0) !== 0 || (condition.trimDeg ?? 0) !== 0) throw new Error('Trim requires centreline TCG and an initially upright, even-keel reference. List equilibrium is not solved.');
  const fsm = inputs.freeSurfaceMomentLongitudinal;
  if (!Number.isFinite(fsm) || fsm < 0) throw new Error('Longitudinal free-surface moment must be finite and non-negative.');
  const hydrostatics = await computeUprightHydrostatics(ship, condition);
  const { draft, lcb, lcf, kmLongitudinal, draftRange } = hydrostatics;
  if (![draft, lcb, lcf, kmLongitudinal].every(value => value !== undefined && Number.isFinite(value)) || !draftRange) throw new Error('Trim requires draft, LCB, LCF, KMl and a supported draft range from the hydrostatic table.');
  const sign = xPositive === 'forward' ? 1 : -1;
  const lcfFromAP = originAP + sign * lcf!;
  if (!Number.isFinite(lcfFromAP) || lcfFromAP < 0 || lcfFromAP > lbp) throw new Error('LCF must lie between AP and FP for this trim model.');
  const freeSurfaceCorrectionLongitudinal = fsm / condition.displacementTonnes;
  const gmLongitudinalCorrected = kmLongitudinal! - condition.vcg - freeSurfaceCorrectionLongitudinal;
  if (!Number.isFinite(gmLongitudinalCorrected) || gmLongitudinalCorrected <= 0) throw new Error('Corrected longitudinal GM must be positive for stable trim equilibrium.');
  if (hydrostatics.gmTransverseCorrected === undefined || hydrostatics.gmTransverseCorrected <= 0) throw new Error('Trim requires positive corrected transverse GM for the assumed upright condition.');
  const leverForward = (condition.lcg - lcb!) * sign;
  const trimmingMoment = condition.displacementTonnes * leverForward;
  const mct1cm = condition.displacementTonnes * gmLongitudinalCorrected / (100 * lbp);
  const slope = leverForward / gmLongitudinalCorrected;
  const trimMetres = slope * lbp; // T_FP - T_AP, independently of source axes.
  const trimDeg = Math.atan(slope) * 180 / Math.PI;
  const draftAft = draft! - slope * lcfFromAP;
  const draftForward = draft! + slope * (lbp - lcfFromAP);
  const meanEndDraft = (draftAft + draftForward) / 2;
  if (![freeSurfaceCorrectionLongitudinal, leverForward, trimmingMoment, mct1cm, trimMetres, trimDeg, draftAft, draftForward, meanEndDraft].every(Number.isFinite) || mct1cm <= 0) throw new Error('Trim calculation exceeds the supported numeric range.');
  if (Math.abs(trimDeg) > maxTrimDeg) throw new Error('Calculated trim exceeds the model small-angle limit.');
  if ([draftAft, draftForward].some(value => value <= 0 || value >= mouldedDepth || value < draftRange.min || value > draftRange.max)) throw new Error('Forward or aft draft falls outside the supported table range or hull depth.');
  return { hydrostatics, draft: draft!, lcb: lcb!, lcf: lcf!, lcfFromAP, gmLongitudinalCorrected, freeSurfaceCorrectionLongitudinal, mct1cm, trimmingMoment, trimMetres, trimDeg, draftAft, draftForward, meanEndDraft, maxTrimDeg,
    warnings: [...hydrostatics.warnings.map(item => item.message), 'Small-trim approximation about LCF using even-keel hydrostatics. Hull-form changes, list, hull deflection and draft-mark offsets are not calculated.'] };
}

export function computeTrimEquilibrium(ship:ShipModelPackage,condition:SimulationCondition,inputs:TrimInputs){
 return sharedResults.read(ship,'linear-trim',{condition:normalizedCondition(condition),inputs},(s,i)=>calculateTrimEquilibrium(s,i.condition,i.inputs));
}
