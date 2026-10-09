import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../scripts/test-server.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { computeLoadingCondition: compute } = await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
const weight = (overrides = {}) => ({ id: 'one', name: 'Weight', massTonnes: 10, lcg: 3, vcg: 4, tcg: -2, ...overrides });
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
test('single weight and signed coordinates', () => {
  const result = compute([weight()]);
  assert.deepEqual(result, { freeSurfaceMomentTransverse: 0, freeSurfaceCorrectionTransverse: 0, virtualVcgTransverse: 4, displacementTonnes: 10, longitudinalMoment: 30, verticalMoment: 40, transverseMoment: -20, lcg: 3, vcg: 4, tcg: -2 });
});
test('equal port and starboard weights cancel transverse moment', () => close(compute([weight(), weight({ id: 'two', tcg: 2 })]).tcg, 0));
test('weighted average, not arithmetic mean', () => close(compute([weight(), weight({ id: 'two', massTonnes: 30, vcg: 8 })]).vcg, 7));
test('zero mass row contributes no moment', () => assert.deepEqual(compute([weight(), weight({ massTonnes: 0, vcg: 300 })]), compute([weight()])));
test('moving weight conserves displacement and changes moments', () => {
 const initial = compute([weight()]); const moved = compute([weight({ lcg: 8 })]);
 close(initial.displacementTonnes, moved.displacementTonnes); close(moved.longitudinalMoment - initial.longitudinalMoment, 50);
});
test('empty and zero-total conditions have no valid centre', () => { assert.throws(() => compute([])); assert.throws(() => compute([weight({ massTonnes: 0 })])); });
test('negative mass and non-finite inputs rejected', () => {
 assert.throws(() => compute([weight({ massTonnes: -1 })]));
 for (const field of ['massTonnes', 'lcg', 'vcg', 'tcg']) for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => compute([weight({ [field]: value })]));
});
test('overflow is rejected', () => assert.throws(() => compute([weight({ massTonnes: Number.MAX_VALUE, lcg: Number.MAX_VALUE })])));
test('synthetic package loading matches default mass and VCG', async () => {
 const base = `${root}/public/built-in-ship-models/training-pontoon-100x20`;
 const manifest = JSON.parse(await readFile(`${base}/manifest.json`, 'utf8'));
 const weights = JSON.parse(await readFile(`${base}/loading/weights.json`, 'utf8'));
 const result = compute(weights);
 close(result.displacementTonnes, 6150); close(result.vcg, manifest.defaultCondition.vcg);
});
test('reviewed workbook final condition from constituent weights', async () => {
 const reference = JSON.parse(await readFile(`${root}/validation-references/reviewed-loading-case.json`, 'utf8'));
 const actual = compute(reference.weights);
 for (const [key, expected] of Object.entries(reference.expected)) close(actual[key], expected, 1e-6);
 console.log('Workbook comparison:', actual);
});
