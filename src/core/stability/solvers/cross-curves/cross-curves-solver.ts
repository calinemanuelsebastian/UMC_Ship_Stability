import {sharedResults} from '../../../calculations/shared-results';
import {shipResourceUrl} from '../../../domain/ship-resource';
import type { ShipModelPackage, ShipResource, SimulationCondition } from '../../../domain/ship-model';
import type { StabilityResult } from '../../../domain/stability-result';
import { interpolateTableValue } from '../../../math/interpolation';
import { computeFreeSurfaceCorrection } from '../../../loading/free-surface-correction';
import { parseCrossCurvesCsv } from './cross-curves-parser';

export const crossCurvesSolver = {
  canSolve: (resource: ShipResource) => resource.kind === 'stability.cross-curves',
  async compute(ship: ShipModelPackage, resource: ShipResource, condition: SimulationCondition, displacementTonnes: number): Promise<StabilityResult> {
    if (resource.config?.trimDeg !== 0 || resource.config?.heelPositive !== 'starboard' || resource.config?.knReference !== 'baseline') throw new Error('Cross curves must declare zero trim, starboard-positive heel and baseline-referenced KN.');
    if ((condition.trimDeg ?? 0) !== 0) throw new Error('Only zero-trim cross curves are supported.');
    const { units, coordinateSystem } = ship.manifest;
    if (units.length !== 'm' || units.mass !== 't' || units.density !== 't/m3' || units.angle !== 'deg' || coordinateSystem.yPositive !== 'starboard' || coordinateSystem.zPositive !== 'up') throw new Error('Cross curves require m, t, t/m³, degrees, starboard-positive TCG and positive-up baseline VCG.');
    if (![condition.vcg, condition.tcg, condition.waterDensity, displacementTonnes].every(Number.isFinite) || condition.waterDensity <= 0 || displacementTonnes <= 0) throw new Error('Enter finite VCG/TCG and positive displacement and water density.');
    const correction = computeFreeSurfaceCorrection(displacementTonnes, condition.vcg, condition.freeSurfaceMomentTransverse ?? 0);
    if (!resource.path) throw new Error('Cross-curve resource is missing its CSV path.');
    const table = await sharedResults.read(ship,'cross-curve-csv',resource.path,async s=>{
      const response=await fetch(shipResourceUrl(s,resource.path!));
      if(!response.ok)throw new Error('Could not load cross-curve table.');
      return parseCrossCurvesCsv(await response.text());
    });
    let volume = displacementTonnes / condition.waterDensity;
    if (!Number.isFinite(volume) || volume <= 0) throw new Error('Requested displacement produces invalid volume.');
    const endpoint = table.volumes.find(value => Math.abs(value - volume) <= 8 * Number.EPSILON * Math.max(value, volume));
    if (endpoint !== undefined) volume = endpoint;
    if (volume < table.volumes[0] || volume > table.volumes[table.volumes.length - 1]) throw new Error(`Displacement is outside the cross-curve range ${table.volumes[0] * condition.waterDensity}–${table.volumes[table.volumes.length - 1] * condition.waterDensity} t at this water density.`);
    const points = table.angles.map(heelDeg => {
      const kn = interpolateTableValue(table.rows.filter(row => row.heelDeg === heelDeg), volume, row => row.volume, row => row.kn)!;
      const radians = heelDeg * Math.PI / 180;
      const gz = kn - condition.vcg * Math.sin(radians) - condition.tcg * Math.cos(radians);
      const gzCorrected = gz - correction.freeSurfaceCorrectionTransverse * Math.sin(radians);
      if (![kn, gz, gzCorrected].every(Number.isFinite)) throw new Error('GZ exceeds the supported numeric range.');
      return { heelDeg, kn, gz, gzCorrected };
    });
    const warnings = ['Zero-trim cross curves only; trim equilibrium, downflooding and regulatory criteria are not evaluated.'];
    if ((condition.freeSurfaceMomentTransverse ?? 0) > 0) warnings.push('Corrected GZ uses constant FSM/displacement × sin(heel), a virtual-KG approximation. Angle-dependent liquid shifting is not modelled.');
    if (condition.tcg !== 0) warnings.push('TCG is included with its sign. Port and starboard GZ are not mirror images; zero heel need not be an equilibrium.');
    return { condition, displacementTonnes, volume, freeSurfaceCorrectionTransverse: correction.freeSurfaceCorrectionTransverse, points, source: { resourceId: resource.id, resourcePath: resource.path, resourceLabel: resource.label ?? resource.id }, warnings };
  },
};
