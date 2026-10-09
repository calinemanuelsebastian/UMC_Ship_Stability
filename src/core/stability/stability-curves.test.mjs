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
const { computeStabilityCurves: compute } = await server.ssrLoadModule('/src/core/stability/compute-stability-curves.ts');
const { parseCrossCurvesCsv: parse } = await server.ssrLoadModule('/src/core/stability/solvers/cross-curves/cross-curves-parser.ts');
const basePath = `${root}/public/built-in-ship-models/training-pontoon-100x20`;
const manifest = JSON.parse(await readFile(`${basePath}/manifest.json`, 'utf8'));
const sample = await readFile(`${basePath}/stability/cross-curves.csv`, 'utf8');
const ship = { manifest, baseUrl: '/fixture/' };
const condition = { ...manifest.defaultCondition, draft: undefined, displacementTonnes: 6150, freeSurfaceMomentTransverse: 0 };
const csv = text => { sharedResults.invalidate(ship); globalThis.fetch = async () => new Response(text); };
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const point = (result, angle) => result.points.find(value => value.heelDeg === angle);
test('synthetic prism: zero heel, small-angle formula and 90-degree geometry', async () => {
 csv(sample); const result = await compute(ship, condition);
 close(point(result,0).gz,0); close(point(result,90).kn,4); close(point(result,90).gz,-1);
 const theta=Math.PI/180, bm=400/36, km=1.5+bm;
 close(point(result,1).gz,(km-5+.5*bm*Math.tan(theta)**2)*Math.sin(theta));
});
test('volume interpolation uses weighted endpoints', async () => {
 csv('volume,heelDeg,kn\n1000,0,0\n1000,30,2\n2000,0,0\n2000,30,4');
 const result=await compute(ship,{...condition,waterDensity:1,displacementTonnes:1250});
 close(point(result,30).kn,2.5);close(point(result,30).gz,0);
});
test('TCG is signed and does not mirror the corrected negative branch', async () => {
 csv(sample); const result=await compute(ship,{...condition,tcg:1});
 close(point(result,0).gz,-1);
 close(point(result,30).gz+point(result,-30).gz,-2*Math.cos(Math.PI/6));
});
test('constant-FSM correction applied once, physical KG preserved', async () => {
 csv(sample); const dry=await compute(ship,condition), wet=await compute(ship,{...condition,freeSurfaceMomentTransverse:615});
 close(wet.condition.vcg,5);close(point(wet,30).gz,point(dry,30).gz);
 close(point(wet,30).gzCorrected,point(wet,30).gz-.05);
 close(point(wet,-30).gzCorrected,point(wet,-30).gz+.05);
});
test('water density resolves volume at constant mass',async()=>{
 csv(sample);const a=await compute(ship,condition),b=await compute(ship,{...condition,waterDensity:1,displacementTonnes:6000});
 close(point(a,30).kn,point(b,30).kn);
});
test('range boundaries and all out-of-range requests',async()=>{
 csv(sample);for(const displacementTonnes of [2050,10250]) await compute(ship,{...condition,displacementTonnes});
 for(const displacementTonnes of [0,-1,NaN,Infinity,2000,11000]) await assert.rejects(compute(ship,{...condition,displacementTonnes}));
});
test('trim, coordinate conventions and resource compatibility enforced',async()=>{
 csv(sample);await assert.rejects(compute(ship,{...condition,trimDeg:1}));
 await assert.rejects(compute({...ship,manifest:{...manifest,resources:[]}},condition));
 await assert.rejects(compute({...ship,manifest:{...manifest,coordinateSystem:{...manifest.coordinateSystem,yPositive:'port'}}},condition));
 const bad=structuredClone(ship);bad.manifest.resources.find(r=>r.kind==='stability.cross-curves').config.trimDeg=-1;
 await assert.rejects(compute(bad,condition));
});
test('CSV incomplete grid, duplicates and missing values rejected',()=>{
 for(const text of ['volume,heelDeg,kn\n1000,0,0\n1000,0,0','volume,heelDeg,kn\n1000,0,0\n1000,30,2\n2000,0,0','volume,heelDeg,kn\n1000,0,\n1000,30,2','volume,heelDeg,kn\n1000,10,1\n1000,30,2']) assert.throws(()=>parse(text));
});
test('European CSV and unsorted complete grid',()=>{
 const table=parse('volume;heelDeg;kn\n2000;30;4,0\n1000;0;0\n1000;30;2,0\n2000;0;0');
 assert.deepEqual(table.angles,[0,30]);assert.deepEqual(table.volumes,[1000,2000]);
});
test('missing resource files fail visibly',async()=>{
 sharedResults.invalidate(ship); globalThis.fetch=async()=>new Response('',{status:404});await assert.rejects(compute(ship,condition),/Could not load/);
});
