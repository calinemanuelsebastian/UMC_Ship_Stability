import {shipResourceUrl} from '../../core/domain/ship-resource';
import type { ShipModelPackage } from '../../core/domain/ship-model';
import { validationQuantities, type ValidationSuite } from '../../core/domain/validation-case';

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export function parseValidationSuite(data: unknown): ValidationSuite {
  if (!object(data) || data.schemaVersion !== '1.0.0' || !Array.isArray(data.cases) || !data.cases.length) throw new Error('Validation suite requires schemaVersion 1.0.0 and at least one case.');
  const ids = new Set<string>();
  for (const entry of data.cases) {
    if (!object(entry) || !text(entry.id) || ids.has(entry.id) || !text(entry.name) || !text(entry.description) || !text(entry.source) || !Array.isArray(entry.expected) || !entry.expected.length) throw new Error('Invalid validation case metadata or empty expectations.');
    ids.add(entry.id);
    const quantities = new Set<string>();
    for (const item of entry.expected) {
      if (!object(item) || typeof item.quantity !== 'string' || !validationQuantities.some(key => key === item.quantity) || quantities.has(JSON.stringify([item.quantity, item.heelDeg, item.timeSeconds])) || !finite(item.value) || !finite(item.tolerance) || item.tolerance < 0 || !text(item.unit)) throw new Error(`Invalid expectations in validation case ${entry.id}.`);
      if (['draftForward', 'draftAft', 'trimMetres', 'trimDeg', 'mct1cm', 'gmLongitudinalCorrected'].includes(item.quantity) && entry.kind !== 'trim') throw new Error('Trim expectations require a trim case.');
      const curveQuantity = ['kn', 'gz', 'gzCorrected'].includes(item.quantity);
      const rollSample = ['heelDeg', 'angularVelocityDegPerSecond'].includes(item.quantity);
      if (curveQuantity ? entry.kind !== 'stability' || !finite(item.heelDeg) || Math.abs(item.heelDeg) > 180 : item.heelDeg !== undefined) throw new Error('GZ sample expectations require a stability case and a finite signed heel.');
      if (rollSample ? entry.kind !== 'roll' || !finite(item.timeSeconds) || item.timeSeconds < 0 : item.timeSeconds !== undefined) throw new Error('Roll sample expectations require a roll case and a non-negative sample time.');
      if (['naturalPeriodSeconds', 'dampedPeriodSeconds'].includes(item.quantity) && entry.kind !== 'roll') throw new Error('Period expectations require a roll case.');
      quantities.add(JSON.stringify([item.quantity, item.heelDeg, item.timeSeconds]));
    }
    if (entry.kind === 'hydrostatics' || entry.kind === 'stability' || entry.kind === 'roll' || entry.kind === 'trim') {
      const condition = entry.condition;
      if (!object(condition) || !['vcg', 'lcg', 'tcg', 'waterDensity'].every(key => finite(condition[key])) || (condition.waterDensity as number) <= 0 || (condition.draft === undefined) === (condition.displacementTonnes === undefined)) throw new Error(`Invalid condition in validation case ${entry.id}.`);
      for (const key of ['draft', 'displacementTonnes', 'heelDeg', 'trimDeg', 'freeSurfaceMomentTransverse']) if (condition[key] !== undefined && !finite(condition[key])) throw new Error(`Invalid ${key} in validation case ${entry.id}.`);
      if ((entry.kind === 'stability' || entry.kind === 'roll' || entry.kind === 'trim') && (!finite(condition.displacementTonnes) || condition.displacementTonnes <= 0 || condition.draft !== undefined)) throw new Error('Curve and roll reference cases require positive displacement without draft.');
      if (entry.kind === 'trim' && (!object(entry.inputs) || !finite(entry.inputs.freeSurfaceMomentLongitudinal) || entry.inputs.freeSurfaceMomentLongitudinal < 0)) throw new Error('Trim reference inputs require a non-negative longitudinal FSM.');
      if (entry.kind === 'roll') {
        if (!object(entry.inputs) || !['effectiveRadiusOfGyration', 'dampingRatio', 'initialHeelDeg', 'durationSeconds'].every(key => finite((entry.inputs as ObjectValue)[key]))) throw new Error('Roll reference inputs must be finite.');
        if (entry.expected.some(item => object(item) && finite(item.timeSeconds) && item.timeSeconds > (entry.inputs as { durationSeconds: number }).durationSeconds)) throw new Error('Roll sample time exceeds duration.');
      }
    } else if (entry.kind === 'loading' || entry.kind === 'loading-hydrostatics') {
      if (!Array.isArray(entry.weights) || !entry.weights.length) throw new Error(`Missing weights in validation case ${entry.id}.`);
      const weightIds = new Set<string>();
      for (const weight of entry.weights) {
        if (!object(weight) || !text(weight.id) || weightIds.has(weight.id) || !text(weight.name) || !['massTonnes', 'lcg', 'vcg', 'tcg'].every(key => finite(weight[key])) || (weight.massTonnes as number) < 0 || (weight.freeSurfaceMomentTransverse !== undefined && (!finite(weight.freeSurfaceMomentTransverse) || weight.freeSurfaceMomentTransverse < 0))) throw new Error(`Invalid weight in validation case ${entry.id}.`);
        weightIds.add(weight.id);
      }
      if (entry.kind === 'loading-hydrostatics' && (!finite(entry.waterDensity) || entry.waterDensity <= 0)) throw new Error('Validation water density must be positive.');
    } else throw new Error(`Unsupported validation case kind: ${String(entry.kind)}`);
  }
  return data as ValidationSuite;
}
export async function loadValidationCases(ship: ShipModelPackage): Promise<ValidationSuite | undefined> {
  const resource = ship.manifest.resources.find(item => item.kind === 'validation.reference-cases');
  if (!resource) return undefined;
  if (!resource.path) throw new Error('Validation resource is missing its path.');
  const response = await fetch(shipResourceUrl(ship,resource.path!));
  if (!response.ok) throw new Error('Could not load the model’s validation cases.');
  return parseValidationSuite(await response.json());
}
