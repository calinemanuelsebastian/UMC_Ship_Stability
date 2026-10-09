import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../../scripts/test-server.mjs';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await server.close(); });
const { runValidationCase } = await server.ssrLoadModule('/src/core/hydrostatics/reference/run-validation-case.ts');
const { parseValidationSuite, loadValidationCases } = await server.ssrLoadModule('/src/platform/ship-models/load-validation-cases.ts');
const basePath = `${root}/public/built-in-ship-models/training-pontoon-100x20`;
const manifest = JSON.parse(await readFile(`${basePath}/manifest.json`, 'utf8'));
const rawSuite = JSON.parse(await readFile(`${basePath}/validation/reference-cases.json`, 'utf8'));
const suite = parseValidationSuite(rawSuite);
const ship = { manifest, baseUrl: '/fixture/' };
globalThis.fetch = async url => new Response(await readFile(`${basePath}/${String(url).replace('/fixture/', '')}`, 'utf8'));
test('all sixteen package reference cases pass via production calculations', async () => {
 const loaded = await loadValidationCases(ship);
 assert.equal(loaded.cases.length, 16);
 for (const entry of loaded.cases) {
  const result = await runValidationCase(ship, entry);
  assert.equal(result.passed, true, `${entry.id}: ${JSON.stringify(result)}`);
 }
});
test('changed expected value is reported as a failure', async () => {
 const entry = structuredClone(suite.cases[0]); entry.expected[0].value = 999;
 const result = await runValidationCase(ship, entry);
 assert.equal(result.passed, false); assert.equal(result.comparisons[0].passed, false); assert.equal(result.comparisons[0].actual, 3);
});
test('missing quantity fails instead of being treated as zero', async () => {
 const entry = structuredClone(suite.cases[4]); entry.expected = [{ quantity: 'kb', value: 0, tolerance: 1, unit: 'm' }];
 const result = await runValidationCase(ship, entry);
 assert.equal(result.passed, false); assert.equal(result.comparisons[0].actual, undefined);
});
test('solver errors produce a failed case with the error', async () => {
 const entry = structuredClone(suite.cases[0]); entry.condition.draft = 100;
 const result = await runValidationCase(ship, entry);
 assert.equal(result.passed, false); assert.match(result.error, /outside/);
});
test('malformed suites cannot quietly produce a passing result', () => {
 for (const value of [null, {}, { schemaVersion: '1.0.0', cases: [] }]) assert.throws(() => parseValidationSuite(value));
 for (const modify of [s => s.cases[0].expected[0].tolerance = -1, s => s.cases[0].expected = [], s => s.cases[0].expected[0].quantity = 'notAResult', s => s.cases.push(s.cases[0]), s => s.cases[0].condition.displacementTonnes = 10]) {
  const copy = structuredClone(rawSuite); modify(copy); assert.throws(() => parseValidationSuite(copy));
 }
});
test('model without a validation resource returns no suite', async () => {
 const other = { ...ship, manifest: { ...manifest, resources: [] } };
 assert.equal(await loadValidationCases(other), undefined);
});

 test('GZ and roll sample mismatches fail at the selected location', async () => {
  for (const kind of ['stability', 'roll']) {
   const entry=structuredClone(suite.cases.find(item=>item.kind===kind));
   entry.expected.at(-1).value+=1;
   const result=await runValidationCase(ship,entry);
   assert.equal(result.passed,false);assert.equal(result.comparisons.at(-1).passed,false);
   assert.ok(Number.isFinite(result.comparisons.at(-1).actual));
  }
 });
 test('missing angle or unsampled time is unavailable, never interpolated silently', async () => {
  for (const kind of ['stability','roll']) {
   const entry=structuredClone(suite.cases.find(item=>item.kind===kind));
   entry.expected=[kind==='stability'?{quantity:'gz',heelDeg:1.5,value:0,tolerance:100,unit:'m'}:{quantity:'heelDeg',timeSeconds:.000123,value:0,tolerance:100,unit:'°'}];
   const result=await runValidationCase(ship,entry);
   assert.equal(result.passed,false);assert.equal(result.comparisons[0].actual,undefined);
  }
 });
 test('sample selectors and roll metadata are validated', () => {
  const gz=suite.cases.find(item=>item.kind==='stability'),roll=suite.cases.find(item=>item.kind==='roll');
  const reject=entry=>assert.throws(()=>parseValidationSuite({schemaVersion:'1.0.0',cases:[entry]}));
  let entry=structuredClone(gz);delete entry.expected[0].heelDeg;reject(entry);
  entry=structuredClone(gz);entry.expected.push(entry.expected[0]);reject(entry);
  entry=structuredClone(gz);entry.expected[0].timeSeconds=0;reject(entry);
  entry=structuredClone(roll);delete entry.inputs;reject(entry);
  entry=structuredClone(roll);entry.expected.at(-1).timeSeconds=999;reject(entry);
  entry=structuredClone(roll);entry.expected.at(-1).timeSeconds=-1;reject(entry);
 });
 test('missing cross curves fail only the affected case and retain solver message', async () => {
  const other={...ship,manifest:{...manifest,resources:manifest.resources.filter(item=>item.kind!=='stability.cross-curves')}};
  const result=await runValidationCase(other,suite.cases.find(item=>item.kind==='stability'));
  assert.equal(result.passed,false);assert.ok(result.error);
  assert.equal((await runValidationCase(other,suite.cases.find(item=>item.kind==='roll'))).passed,true);
 });
