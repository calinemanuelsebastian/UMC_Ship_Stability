import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../scripts/test-server.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await server.close(); });
const {sharedResults}=await server.ssrLoadModule('/src/core/calculations/shared-results.ts');
const { computeFreeSurfaceCorrection: correction } = await server.ssrLoadModule('/src/core/loading/free-surface-correction.ts');
const { computeLoadingCondition: loading } = await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
const { computeUprightHydrostatics: compute } = await server.ssrLoadModule('/src/core/hydrostatics/compute-upright-hydrostatics.ts');
const { loadLoadingWeights } = await server.ssrLoadModule('/src/platform/ship-models/load-loading-weights.ts');
const manifest = JSON.parse(await readFile(`${root}/public/built-in-ship-models/training-pontoon-100x20/manifest.json`, 'utf8'));
const ship = { manifest, baseUrl: '/test/' };
const base = { ...manifest.defaultCondition, freeSurfaceMomentTransverse: 0 };
const sample = await readFile(`${root}/public/built-in-ship-models/training-pontoon-100x20/hydrostatics/upright-hydrostatics.csv`, 'utf8');
const weight = { id: 'tank', name: 'Tank', massTonnes: 1000, lcg: 50, vcg: 5, tcg: 0 };
const csv = text => { sharedResults.invalidate(ship); globalThis.fetch = async () => new Response(text); };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
test('zero FSM leaves virtual VCG equal to physical VCG', () => assert.deepEqual(correction(1000, 5, 0), { freeSurfaceCorrectionTransverse: 0, virtualVcgTransverse: 5 }));
test('multiple tank moments sum without changing physical mass moments', () => {
 const dry = loading([weight, { ...weight, id: 'two' }]);
 const wet = loading([{ ...weight, freeSurfaceMomentTransverse: 100 }, { ...weight, id: 'two', freeSurfaceMomentTransverse: 200 }]);
 for (const key of ['displacementTonnes', 'longitudinalMoment', 'verticalMoment', 'transverseMoment', 'lcg', 'vcg', 'tcg']) close(wet[key], dry[key]);
 close(wet.freeSurfaceMomentTransverse, 300); close(wet.freeSurfaceCorrectionTransverse, .15); close(wet.virtualVcgTransverse, 5.15);
});
test('negative and non-finite moments and invalid displacement rejected', () => {
 for (const value of [-1, NaN, Infinity]) {
  assert.throws(() => correction(1000, 5, value));
  assert.throws(() => loading([{ ...weight, freeSurfaceMomentTransverse: value }]));
 }
 for (const value of [0, -1, NaN, Infinity]) assert.throws(() => correction(value, 5, 100));
 assert.throws(() => correction(Number.MIN_VALUE, 5, Number.MAX_VALUE));
});
test('package FSM validation rejects malformed optional field', async () => {
 for (const value of [-1, '100', null]) {
  globalThis.fetch = async () => Response.json([{ ...weight, freeSurfaceMomentTransverse: value }]);
  await assert.rejects(loadLoadingWeights(ship));
 }
});
test('draft and uncorrected hydrostatics remain unchanged; no double correction', async () => {
 csv(sample);
 const dry = await compute(ship, base);
 const wet = await compute(ship, { ...base, freeSurfaceMomentTransverse: 615 });
 for (const key of ['draft', 'displacementTonnes', 'volume', 'gmTransverse', 'gmLongitudinal', 'kmTransverse']) close(wet[key], dry[key]);
 close(wet.centreOfGravity.z, base.vcg); close(wet.condition.vcg, base.vcg);
 close(wet.freeSurfaceCorrectionTransverse, .1); close(wet.virtualVcgTransverse, base.vcg + .1);
 close(wet.gmTransverseCorrected, wet.gmTransverse - .1);
 const repeated = await compute(ship, wet.condition); close(repeated.gmTransverseCorrected, wet.gmTransverseCorrected);
});
test('loading → displacement lookup → correction uses physical VCG once', async () => {
 csv(sample);
 const loaded = loading([{ ...weight, massTonnes: 6150, freeSurfaceMomentTransverse: 615 }]);
 const result = await compute(ship, { ...base, ...loaded, draft: undefined });
 close(result.draft, 3); close(result.virtualVcgTransverse, 5.1); close(result.gmTransverseCorrected, result.kmTransverse - 5.1);
});
test('sea density changes resolved displacement, not supplied tank FSM', async () => {
 csv(sample);
 const result = await compute(ship, { ...base, waterDensity: 1, freeSurfaceMomentTransverse: 615 });
 close(result.freeSurfaceMomentTransverse, 615); close(result.freeSurfaceCorrectionTransverse, 615 / 6000);
});
test('missing KM preserves correction but leaves corrected GM unavailable', async () => {
 csv('draft,volume\n3,6000');
 const result = await compute(ship, { ...base, freeSurfaceMomentTransverse: 100 });
 assert.equal(result.gmTransverseCorrected, undefined); assert.ok(result.freeSurfaceCorrectionTransverse > 0);
});
test('missing or zero displacement does not manufacture a correction', async () => {
 for (const text of ['draft,kb\n3,1.5', 'draft,volume\n3,0']) {
  csv(text); const result = await compute(ship, { ...base, freeSurfaceMomentTransverse: 100 });
  assert.equal(result.freeSurfaceCorrectionTransverse, undefined);
  assert.ok(result.warnings.some(warning => warning.code === 'missing-free-surface-displacement'));
 }
});
test('corrected non-positive GM emits warning while raw GM remains positive', async () => {
 csv(sample); const result = await compute(ship, { ...base, freeSurfaceMomentTransverse: 100000 });
 assert.ok(result.gmTransverse > 0); assert.ok(result.gmTransverseCorrected < 0);
 assert.ok(result.warnings.some(warning => warning.code === 'non-positive-corrected-gm'));
});
test('reviewed workbook correction arithmetic', async () => {
 const ref = JSON.parse(await readFile(`${root}/validation-references/reviewed-free-surface-case.json`, 'utf8'));
 const actual = correction(ref.displacementTonnes, ref.vcg, ref.freeSurfaceMomentTransverse);
 close(actual.freeSurfaceCorrectionTransverse, ref.freeSurfaceCorrectionTransverse);
 close(actual.virtualVcgTransverse, ref.virtualVcgTransverse);
 close(ref.kmTransverse - actual.virtualVcgTransverse, ref.gmTransverseCorrected);
 console.log('Workbook FSC:', actual.freeSurfaceCorrectionTransverse, '; corrected GM:', ref.gmTransverseCorrected);
});
