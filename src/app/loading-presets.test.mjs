import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {buildLoadingPreset,validateLoadingPresets}=await server.ssrLoadModule('/src/app/loading-presets.ts');
const {draftWeights,evaluateWeights}=await server.ssrLoadModule('/src/app/loading-state.ts');
const {computeTableTrim}=await server.ssrLoadModule('/src/core/trim/trimmed-table.ts');
const {parseScenario}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const {normalizeTankWeights}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const root='validation-references/reviewed-apples-vessel/';const load=async name=>JSON.parse(await readFile(root+name,'utf8'));
const ship={manifest:await load('manifest.json'),baseUrl:'/'},catalog=await load('tanks.json'),reference=draftWeights(await load('weights.json')),table=await load('trimmed-table.json');
test('all ten source-based starters have editable bounded tanks and bracketed trim',()=>{
 assert.equal(catalog.conditions.items.length,10);validateLoadingPresets(catalog.conditions,catalog);
 for(const p of catalog.conditions.items){
  const weights=buildLoadingPreset(ship,reference,catalog,p),{result,error}=evaluateWeights(weights);assert.ok(result,error);
  assert.equal(weights.filter(w=>w.tank).length,catalog.tanks.length);
  assert.deepEqual(normalizeTankWeights(ship,weights,catalog),weights);
  const trim=computeTableTrim(table,{displacementTonnes:result.displacementTonnes,lcg:result.lcg,waterDensity:p.waterDensity},121.7);
  assert.ok(Number.isFinite(trim.trimMetres),p.id);
  const saved=parseScenario({version:1,id:p.id,name:p.name,model:ship.manifest.id,savedAt:new Date().toISOString(),state:{scenario:'loading',manualMode:'displacement',manual:{},weights,tweenDeck:p.tweenDeck,density:p.waterDensity,longitudinalFsm:0}},ship.manifest.id);
  assert.deepEqual(saved.state.weights,weights);
  console.log(p.id,result.displacementTonnes.toFixed(3),trim.trimMetres.toFixed(4));
 }
});
test('replacement is independent, retains fixed weights, omits cargo in ballast and excludes grain moments from FSM',()=>{
 const before=JSON.stringify({reference,catalog});const p=catalog.conditions.items[0];const a=buildLoadingPreset(ship,reference,catalog,p),b=buildLoadingPreset(ship,reference,catalog,p);
 assert.equal(a.filter(w=>w.category==='cargo').length,0);assert.equal(a.filter(w=>w.id==='Calc_G_Cargo-68').length,1);assert.equal(a.filter(w=>w.id==='Calc_G_Cargo-74').length,1);
 a.at(-1).massTonnes='999';assert.notEqual(a.at(-1).massTonnes,b.at(-1).massTonnes);assert.equal(JSON.stringify({reference,catalog}),before);
 for(const p of catalog.conditions.items)assert.ok(p.weights.filter(w=>w.category==='cargo').every(w=>Number(w.freeSurfaceMomentTransverse)===0&&!w.footprint));
 const arrival=buildLoadingPreset(ship,reference,catalog,catalog.conditions.items[1]);assert.ok(evaluateWeights(arrival).result.displacementTonnes<evaluateWeights(b).result.displacementTonnes);
});
test('invalid and duplicate tank allocations are rejected before replacing a plan',()=>{
 for(const change of [p=>p.tanks[0].fillPercent=101,p=>p.tanks.push(p.tanks[0]),p=>p.tanks[0].id='unknown',p=>p.weights[0].massTonnes='NaN']){
  const p=structuredClone(catalog.conditions.items[0]);change(p);assert.throws(()=>buildLoadingPreset(ship,reference,catalog,p));
 }
});
