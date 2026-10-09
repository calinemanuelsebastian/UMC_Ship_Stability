import { computeTrimEquilibrium } from '../../trim/compute-trim-equilibrium';
import { computeStabilityCurves } from '../../stability/compute-stability-curves';
import { computeRollSimulation } from '../../roll/compute-roll-simulation';
import type { ShipModelPackage } from '../../domain/ship-model';
import type { ValidationCase, ValidationCaseResult } from '../../domain/validation-case';
import { computeLoadingCondition } from '../../loading/compute-loading-condition';
import { computeUprightHydrostatics } from '../compute-upright-hydrostatics';

export async function runValidationCase(ship: ShipModelPackage, testCase: ValidationCase): Promise<ValidationCaseResult> {
  try {
    let actual: object;
    let samples: Record<string, number>[] = [];
    let warnings: string[] = [];
    if (testCase.kind === 'loading') {
      actual = computeLoadingCondition(testCase.weights);
    } else if (testCase.kind === 'trim') {
      const result = await computeTrimEquilibrium(ship, testCase.condition, testCase.inputs);
      actual = result; warnings = result.warnings;
    } else if (testCase.kind === 'stability') {
      const result = await computeStabilityCurves(ship, testCase.condition);
      actual = result; samples = result.points; warnings = result.warnings;
    } else if (testCase.kind === 'roll') {
      const result = await computeRollSimulation(ship, testCase.condition, testCase.inputs);
      actual = result; samples = result.points;
      warnings = [...result.hydrostatics.warnings.map(warning => warning.message), 'Linear free roll from rest; constant inertia, damping and initial-GM approximation.'];
    } else {
      const condition = testCase.kind === 'hydrostatics' ? testCase.condition : {
        ...computeLoadingCondition(testCase.weights), draft: undefined,
        waterDensity: testCase.waterDensity, heelDeg: 0, trimDeg: 0,
      };
      const result = await computeUprightHydrostatics(ship, condition);
      // Include requested physical centres as well as solver outputs.
      actual = { lcg: condition.lcg, vcg: condition.vcg, tcg: condition.tcg, ...result };
      warnings = result.warnings.map(warning => warning.message);
    }
    const values = actual as Record<string, unknown>;
    const comparisons = testCase.expected.map(expected => {
      const sample = expected.heelDeg !== undefined ? samples.find(point => point.heelDeg === expected.heelDeg)
        : expected.timeSeconds !== undefined ? samples.find(point => Math.abs(point.timeSeconds - expected.timeSeconds!) <= 8 * Number.EPSILON * Math.max(1, Math.abs(expected.timeSeconds!))) : undefined;
      const value = expected.heelDeg !== undefined || expected.timeSeconds !== undefined ? sample?.[expected.quantity] : values[expected.quantity];
      const numeric = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
      const difference = numeric === undefined ? undefined : Math.abs(numeric - expected.value);
      return { ...expected, actual: numeric, difference, passed: difference !== undefined && difference <= expected.tolerance };
    });
    return { id: testCase.id, passed: comparisons.length > 0 && comparisons.every(item => item.passed), comparisons, warnings };
  } catch (error) {
    return { id: testCase.id, passed: false, comparisons: [], warnings: [], error: error instanceof Error ? error.message : 'Validation calculation failed.' };
  }
}
