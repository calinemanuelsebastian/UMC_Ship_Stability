import type { TrimInputs } from '../trim/compute-trim-equilibrium';
import type { RollInputs } from '../roll/compute-roll-simulation';
import type { LoadingWeight } from './loading-condition';
import type { SimulationCondition } from './ship-model';
export const validationQuantities = [
  'draftForward', 'draftAft', 'trimMetres', 'trimDeg', 'mct1cm', 'gmLongitudinalCorrected', 'lcf',
  'draft', 'displacementTonnes', 'volume', 'kb', 'lcb', 'tcb', 'kmTransverse', 'kmLongitudinal',
  'gmTransverse', 'gmLongitudinal', 'gmTransverseCorrected', 'waterplaneArea', 'tonnesPerCentimetre',
  'lcg', 'vcg', 'tcg', 'longitudinalMoment', 'verticalMoment', 'transverseMoment',
  'kn', 'gz', 'gzCorrected', 'naturalPeriodSeconds', 'dampedPeriodSeconds', 'heelDeg', 'angularVelocityDegPerSecond',
  'freeSurfaceMomentTransverse', 'freeSurfaceCorrectionTransverse', 'virtualVcgTransverse',
] as const;
export type ValidationQuantity = typeof validationQuantities[number];
export type ValidationExpectation = { quantity: ValidationQuantity; value: number; tolerance: number; unit: string; heelDeg?: number; timeSeconds?: number };
export type ValidationCase = {
  id: string;
  name: string;
  description: string;
  source: string;
  expected: ValidationExpectation[];
} & (
  { kind: 'trim'; condition: SimulationCondition; inputs: TrimInputs } |
  { kind: 'stability'; condition: SimulationCondition } |
  { kind: 'roll'; condition: SimulationCondition; inputs: RollInputs } |
  { kind: 'hydrostatics'; condition: SimulationCondition } |
  { kind: 'loading'; weights: LoadingWeight[] } |
  { kind: 'loading-hydrostatics'; weights: LoadingWeight[]; waterDensity: number }
);
export type ValidationSuite = { schemaVersion: '1.0.0'; cases: ValidationCase[] };
export type ValidationComparison = ValidationExpectation & { actual?: number; difference?: number; passed: boolean };
export type ValidationCaseResult = {
  id: string; passed: boolean; comparisons: ValidationComparison[]; error?: string; warnings: string[];
};
