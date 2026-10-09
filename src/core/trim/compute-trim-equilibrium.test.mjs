import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from '../../../scripts/test-server.mjs';
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await server.close(); });
const {sharedResults}=await server.ssrLoadModule('/src/core/calculations/shared-results.ts');
const { computeTrimEquilibrium: compute } = await server.ssrLoadModule('/src/core/trim/compute-trim-equilibrium.ts');
const { computeLoadingCondition: loading } = await server.ssrLoadModule('/src/core/loading/compute-loading-condition.ts');
const { textbookReference, createReferenceTransform } = await server.ssrLoadModule('/src/core/reference/reference-system.ts');
const base = 'public/built-in-ship-models/training-pontoon-100x20/';
const manifest = JSON.parse(await readFile(base+'manifest.json','utf8'));
const csv = await readFile(base+'hydrostatics/upright-hydrostatics.csv','utf8');
const ship={manifest,baseUrl:'/fixture/'};
const condition={displacementTonnes:6150,vcg:5,lcg:51,tcg:0,waterDensity:1.025};
const inputs={freeSurfaceMomentLongitudinal:0};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const useCsv=text=>{ sharedResults.invalidate(ship);globalThis.fetch=async()=>new Response(text);};
const changeColumn=(name,fn)=>{const lines=csv.trim().split('\n').map(line=>line.split(','));const i=lines[0].indexOf(name);return lines.map((row,n)=>n?row.map((v,j)=>j===i?fn(Number(v)):v).join(','):row.join(',')).join('\n');};
test('synthetic equilibrium matches independent rectangular-waterplane balance',async()=>{
 useCsv(csv);const gm=10000/36+1.5-5;
 for(const lever of [-1,0,1]){
  const result=await compute(ship,{...condition,lcg:50+lever},inputs);
  close(result.draftAft,3-50*lever/gm);close(result.draftForward,3+50*lever/gm);
  close(result.trimMetres,result.draftForward-result.draftAft);close(result.mct1cm,6150*gm/10000);
  close(result.trimMetres,result.trimmingMoment/result.mct1cm/100);
 }
});
test('off-centre LCF apportions drafts and preserves draft at flotation centre',async()=>{
 useCsv(changeColumn('lcf',()=>40));const r=await compute(ship,condition,inputs);
 close(r.draftAft+(r.draftForward-r.draftAft)*.4,3);
 close((r.draftForward-3)/(3-r.draftAft),1.5);assert.notEqual(r.meanEndDraft,r.draft);
});
test('longitudinal FSM changes trim; transverse FSM is never substituted',async()=>{
 useCsv(csv);const r=await compute(ship,condition,inputs);
 const transverse=await compute(ship,{...condition,freeSurfaceMomentTransverse:6150},inputs);
 const longitudinal=await compute(ship,condition,{freeSurfaceMomentLongitudinal:6150});
 close(transverse.trimMetres,r.trimMetres);close(longitudinal.gmLongitudinalCorrected,r.gmLongitudinalCorrected-1);
 assert.ok(longitudinal.trimMetres>r.trimMetres);
});
test('weight shift and coordinate presets preserve physical trim',async()=>{
 useCsv(csv);const weights=[{id:'base',name:'Base',massTonnes:6050,lcg:50,tcg:0,vcg:5},{id:'load',name:'Load',massTonnes:100,lcg:60,tcg:0,vcg:5}];
 const c=loading(weights);const r=await compute(ship,{...condition,...c},inputs);
 close(r.trimmingMoment,1000);
 for(const name of ['uk','russian']){
  const ref=createReferenceTransform(manifest.coordinateSystem,textbookReference(manifest.coordinateSystem,name));
  const back=ref.toSource('x',ref.toDisplay('x',c.lcg));
  close((await compute(ship,{...condition,...c,lcg:back},inputs)).trimMetres,r.trimMetres);
 }
});
test('aft-positive source and translated origin give the same physical drafts',async()=>{
 useCsv(csv);const expected=await compute(ship,condition,inputs);
 const shifted=structuredClone(ship);shifted.manifest.coordinateSystem={...manifest.coordinateSystem,xPositive:'aft',longitudinalOriginFromAP:20};
 useCsv(changeColumn('lcb',()=>-30).split('\n').map((line,i)=>i?line.split(',').map((v,j)=>j===14?'-30':v).join(','):line).join('\n'));
 const actual=await compute(shifted,{...condition,lcg:-31},inputs);
 close(actual.draftForward,expected.draftForward);close(actual.draftAft,expected.draftAft);
});
test('density changes reference draft using displacement inversion',async()=>{
 useCsv(csv);const r=await compute(ship,{...condition,displacementTonnes:6000,waterDensity:1},inputs);
 close(r.draft,3);close(r.draftForward,3+50/(10000/36+1.5-5));
});
test('missing columns and missing datum or model limits are rejected',async()=>{
 for(const column of ['lcf','lcb','kmLongitudinal']){useCsv(changeColumn(column,()=>''));await assert.rejects(compute(ship,condition,inputs),/requires draft/);}
 useCsv(csv);
 for(const modify of [s=>delete s.manifest.coordinateSystem.longitudinalOriginFromAP,s=>s.manifest.principalDimensions.lbp=0,s=>s.manifest.resources=s.manifest.resources.filter(r=>r.kind!=='trim.linear-equilibrium')]){
  const other=structuredClone(ship);modify(other);await assert.rejects(compute(other,condition,inputs));
 }
});
test('excess trim, draft bounds, unstable GM, list and invalid inputs fail',async()=>{
 useCsv(csv);
 for(const changes of [{lcg:100},{displacementTonnes:2050},{vcg:300},{tcg:.1},{heelDeg:1},{trimDeg:1},{draft:3},{waterDensity:0},{lcg:Infinity}])await assert.rejects(compute(ship,{...condition,...changes},inputs));
 for(const fsm of [-1,Infinity,NaN,1e9])await assert.rejects(compute(ship,condition,{freeSurfaceMomentLongitudinal:fsm}));
 useCsv(changeColumn('lcf',()=>110));await assert.rejects(compute(ship,condition,inputs),/LCF/);
});
test('published 60 t weight shifted forward 24 m gives 0.15 m trim',async()=>{
 // Barrass & Derrett 2006, ch.16, p.165: L=150 m, Δ=7200 t,
 // shifted weight 60 t through 24 m, GM_L=200 m, change of trim 0.15 m.
 const model=structuredClone(ship);model.manifest.principalDimensions.lbp=150;
 useCsv('draft,volume,kb,lcb,lcf,kmTransverse,kmLongitudinal\n2,4000,1,75,75,10,205\n3,7200,1.5,75,75,10,205\n4,10000,2,75,75,10,205');
 const result=await compute(model,{...condition,waterDensity:1,displacementTonnes:7200,lcg:75.2},inputs);
 close(result.trimMetres,.15);close(result.mct1cm,96);close(result.trimmingMoment,1440);
});
