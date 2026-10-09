import {sharedResults,normalizedCondition} from '../calculations/shared-results';
import { computeFreeSurfaceCorrection } from "../loading/free-surface-correction";
import type { HydrostaticResult } from "../domain/hydrostatic-result";
import type {
  ShipModelPackage,
  ShipResource,
  SimulationCondition,
} from "../domain/ship-model";
import { findHydrostaticSolverForResource } from "./hydrostatic-solver-registry";

export type ComputeUprightHydrostaticsOptions = {
  /**
   * Optional: force the calculation to use a specific resource id.
   *
   * Example:
   * "upright-hydrostatics"
   */
  preferredResourceId?: string;

  /**
   * Optional: force the calculation to use a specific resource kind.
   *
   * Example:
   * "hydrostatics.upright-table"
   */
  preferredResourceKind?: string;
};

async function calculateUprightHydrostatics(
  ship: ShipModelPackage,
  condition: SimulationCondition,
  options: ComputeUprightHydrostaticsOptions = {}
): Promise<HydrostaticResult> {
  const moment = condition.freeSurfaceMomentTransverse ?? 0;
  if (!Number.isFinite(moment) || moment < 0) throw new Error("Transverse free-surface moment must be finite and non-negative.");
  const resources = selectCandidateResources(ship.manifest.resources, options);

  for (const resource of resources) {
    const solver = findHydrostaticSolverForResource(resource);

    if (!solver) {
      continue;
    }

    const result = await solver.computeUprightHydrostatics({
      ship,
      resource,
      condition,
    });
    result.freeSurfaceMomentTransverse = moment;
    if (result.displacementTonnes !== undefined && result.displacementTonnes > 0) {
      const correction = computeFreeSurfaceCorrection(result.displacementTonnes, condition.vcg, moment);
      Object.assign(result, correction);
      result.gmTransverseCorrected = result.gmTransverse === undefined ? undefined : result.gmTransverse - correction.freeSurfaceCorrectionTransverse;
      if (result.gmTransverseCorrected !== undefined && !Number.isFinite(result.gmTransverseCorrected)) throw new Error("Corrected GM exceeds the supported numeric range.");
      if (moment > 0 && result.gmTransverseCorrected !== undefined && result.gmTransverseCorrected <= 0) {
        result.warnings.push({ code: 'non-positive-corrected-gm', severity: 'warning', message: 'Free-surface-corrected GMt is zero or negative.' });
      }
    } else if (moment > 0) {
      result.warnings.push({ code: 'missing-free-surface-displacement', severity: 'warning', message: 'Free-surface correction is unavailable without a positive hydrostatic displacement.' });
    }
    return result;
  }

  throw new Error(
    `No compatible upright hydrostatic solver found for ship model: ${ship.manifest.name}`
  );
}

function selectCandidateResources(
  resources: ShipResource[],
  options: ComputeUprightHydrostaticsOptions
): ShipResource[] {
  if (options.preferredResourceId) {
    return resources.filter(
      (resource) => resource.id === options.preferredResourceId
    );
  }

  if (options.preferredResourceKind) {
    return resources.filter(
      (resource) => resource.kind === options.preferredResourceKind
    );
  }

  return resources;
}
export function computeUprightHydrostatics(ship:ShipModelPackage,condition:SimulationCondition,options:ComputeUprightHydrostaticsOptions={}):Promise<HydrostaticResult>{
 return sharedResults.read(ship,'upright',{condition:normalizedCondition(condition),options:{preferredResourceId:options.preferredResourceId,preferredResourceKind:options.preferredResourceKind}},(s,i)=>calculateUprightHydrostatics(s,i.condition,i.options));
}
