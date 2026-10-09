import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
const {replayReference,replayWorkedExample}=await server.ssrLoadModule('/src/core/stability/reference-replay.ts');
const {parseWeatherEvidence}=await server.ssrLoadModule('/src/core/stability/weather-evidence.ts');
const root='validation-references/reviewed-apples-vessel/',manifest=JSON.parse(await readFile(root+'manifest.json','utf8')),files={};for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(root+r.path,'utf8')};
const cases=parseWeatherEvidence(JSON.parse(files['assessment-basis.json'].data).weatherEvidence).cases;
test('all 37 original conditions replay trim/draft with explicit residuals; source inputs are unchanged',async()=>{
 const ship=mountShipBundle({manifest,files});const before=JSON.stringify(cases);let weights=0,maxTrim=0,maxDraft=0;
 try{for(const c of cases){const r=await replayReference(ship,c);
  for(const label of ['Initial trim','Initial moulded draft']){const row=r.rows.find(x=>x.label===label);assert.ok(Number.isFinite(row.difference));assert.ok(Math.abs(row.difference)<.01,`${c.id} ${label}: ${row.difference}`);if(label==='Initial trim')maxTrim=Math.max(maxTrim,Math.abs(row.difference));else maxDraft=Math.max(maxDraft,Math.abs(row.difference));}
  if(c.weightRows){weights++;for(const label of ['KG','LCG','TCG'])assert.ok(Math.abs(r.rows.find(x=>x.label===label).difference)<.002,`${c.id} ${label}`);assert.ok(Math.abs(r.rows.find(x=>x.label==='Displacement').difference)<.05,c.id);}
  assert.match(r.scope,/Port GZ uses source KN/);
 }
 assert.equal(cases.length,37);assert.equal(weights,7);assert.equal(JSON.stringify(cases),before);console.log({cases:cases.length,weightReplays:weights,maxTrim,maxDraft});
 }finally{ship.release();}
});
test('live starboard worked example reproduces all printed KN/GZ and corrected GM without double FSC',async()=>{
 const ship=mountShipBundle({manifest,files});try{const [a,b]=await Promise.all([replayWorkedExample(ship),replayWorkedExample(ship)]);assert.equal(a,b);assert.equal(a.rows.length,27);for(const r of a.rows)assert.ok(Math.abs(r.difference)<.001,`${r.label}: ${r.difference}`);assert.equal(a.inputs.freeSurfaceMomentTransverse,0);assert.ok(Object.isFrozen(a));}finally{ship.release();}
});
test('malformed reference weights are rejected before calculation',()=>{const raw=JSON.parse(files['assessment-basis.json'].data).weatherEvidence;raw.cases.find(c=>c.weightRows).weightRows[0].massTonnes=-1;assert.throws(()=>parseWeatherEvidence(raw),/reference weight/);});
