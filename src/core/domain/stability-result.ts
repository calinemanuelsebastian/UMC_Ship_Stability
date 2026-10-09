import type { SimulationCondition } from './ship-model';
export type StabilityPoint = { heelDeg: number; kn: number; gz: number; gzCorrected: number };
export type StabilityResult = {
  /** Explicit educational extension; never implies port flooding coverage. */
  derivedPort?: boolean;
  gmAtTrim?: {kmTransverse:number;correctedGm:number;initialTrimMetres:number;sourcePath:string};
  downflooding?: import('../stability/downflooding').FloodScreen;
  condition: SimulationCondition;
  displacementTonnes: number;
  volume: number;
  freeSurfaceCorrectionTransverse: number;
  points: StabilityPoint[];
  source: { resourceId: string; resourcePath: string; resourceLabel: string };
  warnings: string[];
};
