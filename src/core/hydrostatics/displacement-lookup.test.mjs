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
const { computeUprightHydrostatics: compute } = await server.ssrLoadModule('/src/core/hydrostatics/compute-upright-hydrostatics.ts');
const { computeLoadingCondition: loading } = await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
const manifest = JSON.parse(await readFile(`${root}/public/built-in-ship-models/training-pontoon-100x20/manifest.json`, 'utf8'));
const sample = await readFile(`${root}/public/built-in-ship-models/training-pontoon-100x20/hydrostatics/upright-hydrostatics.csv`, 'utf8');
const ship = { manifest, baseUrl: '/test/' };
const condition = { ...manifest.defaultCondition, draft: undefined, displacementTonnes: 6150 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const csv = text => { sharedResults.invalidate(ship); globalThis.fetch = async () => new Response(text); };
test('loading snapshot determines sample draft and GM', async () => {
 csv(sample);
 const weights = JSON.parse(await readFile(`${root}/public/built-in-ship-models/training-pontoon-100x20/loading/weights.json`, 'utf8'));
 const result = await compute(ship, { ...condition, ...loading(weights) });
 close(result.draft, 3); close(result.displacementTonnes, 6150); close(result.gmTransverse, 7.6111111111);
});
test('manual draft and inverse lookup round trip', async () => {
 csv(sample);
 for (const draft of [1, 1.125, 3.125, 5]) {
  const forward = await compute(ship, { ...condition, draft, displacementTonnes: undefined });
  const inverse = await compute(ship, { ...condition, displacementTonnes: forward.displacementTonnes });
  close(inverse.draft, draft); close(inverse.lcb, forward.lcb);
 }
});
test('volume-only and mass-only tables use calculation density', async () => {
 for (const text of ['draft,volume\n1,2000\n2,4000', 'draft,displacementTonnes\n1,2050\n2,4100']) {
  csv(text); const result = await compute(ship, { ...condition, waterDensity: 1, displacementTonnes: 3000 });
  close(result.draft, 1.5); close(result.displacementTonnes, 3000);
 }
});
test('volume remains authoritative when mass is also supplied', async () => {
 csv('draft,volume,displacementTonnes\n1,2000,1\n2,4000,2');
 close((await compute(ship, { ...condition, displacementTonnes: 3075 })).draft, 1.5);
});
test('mixed mass and volume rows are normalized consistently', async () => {
 csv('draft,volume,displacementTonnes\n1,2000,\n2,,4100');
 const result = await compute(ship, { ...condition, displacementTonnes: 3075 }); close(result.draft, 1.5); close(result.displacementTonnes, 3075);
});
test('outside-table and invalid displacement rejected', async () => {
 csv(sample);
 for (const displacementTonnes of [0, -1, NaN, Infinity, 100, 20000]) await assert.rejects(compute(ship, { ...condition, displacementTonnes }));
});
test('missing and ambiguous independent variables rejected', async () => {
 csv(sample);
 await assert.rejects(compute(ship, { ...condition, draft: 3 }));
 await assert.rejects(compute(ship, { ...condition, displacementTonnes: undefined }));
});
test('incomplete, flat, decreasing and duplicate-draft tables rejected', async () => {
 for (const text of ['draft,volume\n1,2000\n2,', 'draft,volume\n1,2000\n2,2000', 'draft,volume\n1,4000\n2,2000', 'draft,volume\n1,2000\n1,4000']) {
  csv(text); await assert.rejects(compute(ship, { ...condition, displacementTonnes: 3075 }));
 }
});
test('singleton table only supports its exact displacement', async () => {
 csv('draft,volume\n3,6000'); close((await compute(ship, condition)).draft, 3);
 await assert.rejects(compute(ship, { ...condition, displacementTonnes: 6151 }));
});
test('mass-based lookup does not bypass heel, trim or density checks', async () => {
 csv(sample);
 for (const change of [{ heelDeg: 1 }, { trimDeg: 1 }, { waterDensity: 0 }]) await assert.rejects(compute(ship, { ...condition, ...change }));
});
test('reviewed workbook upright inverse lookup', async () => {
 const ref = JSON.parse(await readFile(`${root}/validation-references/reviewed-upright-lookup.json`, 'utf8'));
 csv(ref.csv);
 const result = await compute(ship, { ...condition, displacementTonnes: ref.displacementTonnes });
 close(result.draft, ref.draft); close(result.lcb, ref.lcb);
 console.log('Workbook inverse lookup:', result.draft, 'm; LCB:', result.lcb, 'm');
});
