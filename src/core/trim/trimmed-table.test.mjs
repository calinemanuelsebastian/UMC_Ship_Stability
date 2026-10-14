import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../scripts/test-server.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
after(() => server.close());
const { computeTableTrim: compute, parseTrimmedTable: parse, validateTrimmedTableShip: match } = await server.ssrLoadModule('/src/core/trim/trimmed-table.ts');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const base = () => ({ version: 1, modelId: 'test', source: 'Synthetic arithmetic test', waterDensity: 1.025, xPositive: 'forward', longitudinalOriginFromAP: 0, trimPositive: 'bow', draftDatumFromAP: 50,
  tables: [-1, 0, 1].map(trimMetres => ({ trimMetres, rows: [1000, 2000].map(displacementTonnes => ({ displacementTonnes, draft: displacementTonnes / 1000, lcb: 50 + trimMetres, lcf: 50 })) })) });
const input = { displacementTonnes: 1500, lcg: 50.5, waterDensity: 1.025 };
test('interpolates mass then trim and computes drafts from an explicit datum', () => {
  const r = compute(base(), input, 100);
  close(r.trimMetres, .5); close(r.draft, 1.5); close(r.draftAft, 1.25); close(r.draftForward, 1.75); close(r.residualLever, 0);
});
test('reviewed workbook nonzero-trim balance matches saved results', async () => {
  const d = parse(JSON.parse(await readFile(`${root}/validation-references/reviewed-trimmed-table.json`, 'utf8')));
  const r = compute(d, { displacementTonnes: 9644.27, lcg: 59.07752396021627, waterDensity: 1.025 }, 100);
  // LBP is irrelevant to these checks; no source LBP or draft datum is inferred.
  close(r.trimMetres, -1.2610239252984086); close(r.draft, 5.7675477464108456); close(r.lcb, 59.07752396021627); close(r.lcf, 56.671179002082994);
  assert.equal(r.draftAft, undefined); assert.equal(r.draftForward, undefined);
});
test('source aft-positive coordinates produce the same physical trim', () => {
  const data = base(); data.xPositive = 'aft'; data.longitudinalOriginFromAP = 100;
  data.tables.forEach(t => t.rows.forEach(r => { r.lcb = 100 - r.lcb; }));
  close(compute(data, { ...input, lcg: 49.5 }, 100).trimMetres, .5);
});
test('exact trim knots are counted once and displacement endpoints work', () => {
  for (const displacementTonnes of [1000, 2000]) close(compute(base(), { ...input, displacementTonnes, lcg: 50 }, 100).trimMetres, 0);
});
test('no extrapolation in mass or trim, and no bridging missing tables', () => {
  assert.throws(() => compute(base(), { ...input, displacementTonnes: 900 }, 100));
  assert.throws(() => compute(base(), { ...input, lcg: 52 }, 100));
  const d = base(); d.tables[1].rows.forEach(r => { r.displacementTonnes += 2000; });
  assert.throws(() => compute(d, input, 100));
});
test('ambiguous roots and neutral intervals are rejected', () => {
  const d = base(); d.tables[2].rows.forEach(r => { r.lcb = 49; });
  assert.throws(() => compute(d, { ...input, lcg: 49.5 }, 100), /Multiple/);
  d.tables.forEach(t => t.rows.forEach(r => { r.lcb = 50; }));
  assert.throws(() => compute(d, { ...input, lcg: 50 }, 100), /indeterminate/);
});
test('metadata, density and malformed tables fail clearly', () => {
  for (const change of [{ waterDensity: 0 }, { trimPositive: 'stern' }, { tables: [] }, { draftDatumFromAP: NaN }]) assert.throws(() => parse({ ...base(), ...change }));
  assert.throws(() => compute(base(), { ...input, waterDensity: 1 }, 100), /density/);
  const d = base(); d.tables[1].trimMetres = -1; assert.throws(() => parse(d));
  const invalid = base(); invalid.tables[0].rows[1].draft = 1; assert.throws(() => parse(invalid));
});
test('vessel identity and coordinate mismatches are rejected', () => {
  const ship = { manifest: { id: 'test', units: { length: 'm', mass: 't', density: 't/m3', angle: 'deg' }, coordinateSystem: { xPositive: 'forward', zPositive: 'up', longitudinalOriginFromAP: 0 } } };
  match(base(), ship);
  assert.throws(() => match({ ...base(), modelId: 'another-vessel' }, ship));
  assert.throws(() => match({ ...base(), longitudinalOriginFromAP: 50 }, ship));
});
test('local reviewed vessel package loads weights, hydrostatics, trim and validation together', async () => {
  const base = `${root}/validation-references/reviewed-apples-vessel/`;
  const manifest = JSON.parse(await readFile(`${base}manifest.json`, 'utf8'));
  const ship = { manifest, baseUrl: '/local-reviewed-vessel/' };
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    const name = String(url).replace(ship.baseUrl, '');
    assert.ok(['weights.json', 'upright.csv', 'validation.json'].includes(name));
    return new Response(await readFile(`${base}${name}`, 'utf8'));
  };
  try {
    const { loadLoadingWeights } = await server.ssrLoadModule('/src/platform/ship-models/load-loading-weights.ts');
    const { computeLoadingCondition } = await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
    const { computeUprightHydrostatics } = await server.ssrLoadModule('/src/core/hydrostatics/compute-upright-hydrostatics.ts');
    const { loadValidationCases } = await server.ssrLoadModule('/src/platform/ship-models/load-validation-cases.ts');
    const loaded = computeLoadingCondition(await loadLoadingWeights(ship));
    const hydro = await computeUprightHydrostatics(ship, { ...manifest.defaultCondition, ...loaded });
    close(loaded.displacementTonnes, 9644.27); close(hydro.draft, 5.8056640625);
    const table = parse(JSON.parse(await readFile(`${base}trimmed-table.json`, 'utf8')));
    match(table, ship);
    const result = compute(table, { ...loaded, waterDensity: 1.025 }, manifest.principalDimensions.lbp);
    assert.ok(Math.abs(result.trimMetres + 1.2610239252984086) < 1e-6);
    close(result.draftAft, 6.398059637809916); close(result.draftForward-result.draftAft,result.trimMetres);
    assert.equal((await loadValidationCases(ship)).cases.length, 1);
    assert.equal(manifest.principalDimensions.mouldedDepth, 11.4);
    assert.ok(!manifest.resources.some(r => r.kind === 'visualization.box-hull'));
  } finally { globalThis.fetch = original; }
});

test('exact mass and trim knots retain optional LCF without requiring unused neighbours',()=>{
 const d=base();delete d.tables[0].rows[1].lcf;delete d.tables[1].rows[0].lcf;
 assert.equal(compute(d,{...input,displacementTonnes:2000,lcg:50},100).lcf,50);
 assert.equal(compute(d,{...input,displacementTonnes:1500,lcg:50},100).lcf,undefined);
 assert.equal(compute(d,{...input,displacementTonnes:2000,lcg:49.5},100).lcf,undefined);
});
