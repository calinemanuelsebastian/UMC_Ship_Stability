import type {ShipModelPackage, SimulationCondition} from '../core/domain/ship-model';
import {computeStabilityCurves} from '../core/stability/compute-stability-curves';
import {heelEquilibrium} from '../core/stability/heel-equilibrium';
import {computeUprightHydrostatics} from '../core/hydrostatics/compute-upright-hydrostatics';
import {computeTrimView} from './trim-view';

/** Reuse the curve and its initial longitudinal condition, never infer a heeled draft path. */
export async function computeHeelView(ship:ShipModelPackage, condition:SimulationCondition, longitudinalFsm:number) {
  const initialTrimReference=ship.manifest.resources.some(r=>r.kind==='stability.constant-lcb-cross-curves');
  const [curve, reference]=await Promise.all([
    computeStabilityCurves(ship,condition,{longitudinalFsm}),
    initialTrimReference ? computeTrimView(ship,condition,longitudinalFsm) : computeUprightHydrostatics(ship,condition).then(value=>{
      if(value.draft===undefined)throw new Error('No draft is available for the 3D view.');
      return {draftAft:value.draft,draftForward:value.draft,trimDeg:0,illustrativeDrafts:false};
    }),
  ]);
  const solution=heelEquilibrium(curve);
  if(!solution.equilibrium)throw new Error(solution.message+(initialTrimReference?' Only starboard data are supplied; port equilibrium cannot be inferred.':''));
  return {...reference,heelDeg:solution.equilibrium.heelDeg,warnings:curve.warnings,initialTrimReference};
}
