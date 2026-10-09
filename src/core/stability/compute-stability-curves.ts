import {sharedResults,normalizedCondition} from '../calculations/shared-results';
import {computeConstantLcb} from './constant-lcb';
import type { ShipModelPackage, SimulationCondition } from '../domain/ship-model';
import type { StabilityResult } from '../domain/stability-result';
import { crossCurvesSolver } from './solvers/cross-curves/cross-curves-solver';

// Dispatch by resource capability; React never calls a specific solver.
const stabilitySolvers = [crossCurvesSolver];
async function calculateStabilityCurves(ship: ShipModelPackage, condition: SimulationCondition, options:{initialTrimMetres?:number;longitudinalFsm?:number}={}): Promise<StabilityResult> {
  if (condition.displacementTonnes === undefined || condition.draft !== undefined) throw new Error('Stability curves require displacement, without a prescribed draft.');
  if(ship.manifest.resources.some(r=>r.kind==='stability.constant-lcb-cross-curves'))return computeConstantLcb(ship,condition,options);
  for (const resource of ship.manifest.resources) {
    const solver = stabilitySolvers.find(candidate => candidate.canSolve(resource));
    if (solver) return solver.compute(ship, resource, condition, condition.displacementTonnes);
  }
  throw new Error('This model has no compatible cross-curve resource.');
}

export function computeStabilityCurves(ship:ShipModelPackage,condition:SimulationCondition,options:{initialTrimMetres?:number;longitudinalFsm?:number}={}):Promise<StabilityResult>{
 return sharedResults.read(ship,'stability',{condition:normalizedCondition(condition),options:{initialTrimMetres:options.initialTrimMetres,longitudinalFsm:options.longitudinalFsm??0}},(s,i)=>calculateStabilityCurves(s,i.condition,i.options));
}
