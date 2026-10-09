import type { ShipModelPackage, SimulationCondition } from '../domain/ship-model';
import { computeUprightHydrostatics } from '../hydrostatics/compute-upright-hydrostatics';

export type RollInputs = {
  effectiveRadiusOfGyration: number;
  dampingRatio: number;
  initialHeelDeg: number;
  durationSeconds: number;
};
export type RollPoint = { timeSeconds: number; heelDeg: number; angularVelocityDegPerSecond: number };
export function computeFreeRoll(gm: number, inputs: RollInputs) {
  const { effectiveRadiusOfGyration: radius, dampingRatio: damping, initialHeelDeg: initial, durationSeconds: duration } = inputs;
  if (![gm, radius, damping, initial, duration].every(Number.isFinite)) throw new Error('All roll inputs and corrected GM must be finite.');
  if (gm <= 0 || radius <= 0) throw new Error('Free roll about upright requires positive corrected GM and effective radius of gyration.');
  if (damping < 0 || damping >= 1) throw new Error('This oscillatory free-roll model requires a damping ratio from 0 up to, but excluding, 1.');
  if (Math.abs(initial) > 5) throw new Error('Initial heel must be within ±5° for this small-angle teaching model.');
  if (duration <= 0 || duration > 600) throw new Error('Duration must be greater than zero and at most 600 seconds.');
  const naturalFrequency = Math.sqrt(9.80665 * gm) / radius;
  const dampedFrequency = naturalFrequency * Math.sqrt(1 - damping * damping);
  const naturalPeriodSeconds = 2 * Math.PI / naturalFrequency;
  const dampedPeriodSeconds = 2 * Math.PI / dampedFrequency;
  const count = Math.max(600, Math.ceil(duration / naturalPeriodSeconds * 80));
  if (![naturalFrequency, dampedFrequency, naturalPeriodSeconds, dampedPeriodSeconds, count].every(Number.isFinite) || naturalFrequency <= 0 || dampedFrequency <= 0 || count > 12000) throw new Error('Parameters exceed the supported time resolution; shorten the duration or revise inertia/GM.');
  const decay = damping * naturalFrequency;
  const points: RollPoint[] = Array.from({ length: count + 1 }, (_, index) => {
    const timeSeconds = duration * index / count;
    const phase = dampedFrequency * timeSeconds;
    // Exact solution released from rest: phi(0)=initial, phi'(0)=0.
    const envelope = initial * Math.exp(-decay * timeSeconds);
    const heelDeg = envelope * (Math.cos(phase) + decay / dampedFrequency * Math.sin(phase));
    const angularVelocityDegPerSecond = -envelope * naturalFrequency * naturalFrequency / dampedFrequency * Math.sin(phase);
    if (![heelDeg, angularVelocityDegPerSecond].every(Number.isFinite)) throw new Error('Roll response exceeds the supported numeric range.');
    return { timeSeconds, heelDeg, angularVelocityDegPerSecond };
  });
  return { gmTransverseCorrected: gm, naturalPeriodSeconds, dampedPeriodSeconds, points };
}
export async function computeRollSimulation(ship: ShipModelPackage, condition: SimulationCondition, inputs: RollInputs) {
  if (condition.tcg !== 0) throw new Error('This upright free-roll model requires TCG = 0. A listed loading condition needs an equilibrium solver first.');
  if (ship.manifest.coordinateSystem.yPositive !== 'starboard') throw new Error('Roll simulation requires starboard-positive transverse coordinates.');
  if (ship.manifest.units.angle !== 'deg') throw new Error('Roll simulation requires degree-based model angles.');
  const hydrostatics = await computeUprightHydrostatics(ship, condition);
  if (hydrostatics.gmTransverseCorrected === undefined) throw new Error('The selected model cannot supply corrected transverse GM.');
  return { ...computeFreeRoll(hydrostatics.gmTransverseCorrected, inputs), hydrostatics };
}
export type RollResult = Awaited<ReturnType<typeof computeRollSimulation>>;
