import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {editTankContents,tankAmount,planDeckChange}=await server.ssrLoadModule('/src/app/onboard-operations.ts');
const {tankWeight,cleanLoadingPlan,isFixedWeight,normalizeTankWeights}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const {draftWeights,evaluateWeights}=await server.ssrLoadModule('/src/app/loading-state.ts');
const {conditionTransaction,canUndoCondition}=await server.ssrLoadModule('/src/app/condition-transaction.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const {applyTankPreset,applyDepartureOnboard}=await server.ssrLoadModule('/src/app/departure-presets.ts');
const {onboardTankCatalog}=await server.ssrLoadModule('/src/app/loading-workflow.ts');
const root='validation-references/reviewed-apples-vessel/';
const ship={manifest:JSON.parse(await readFile(root+'manifest.json','utf8')),baseUrl:'/test/'};
const catalog=JSON.parse(await readFile(root+'tanks.json','utf8'));
const reference=draftWeights(JSON.parse(await readFile(root+'weights.json','utf8')));
const near=(a,b)=>assert.ok(Math.abs(Number(a)-Number(b))<1e-8*Math.max(1,Math.abs(Number(b))),`${a} != ${b}`);
test('all 68 tanks: percentage, mass and volume entry produce the same mass, centres and FSM',()=>{
 for(const tank of catalog.tanks)for(const density of [1,.89,1.025])for(const fill of [0,.25,.5,1]){
  const input={id:tank.id,volumeM3:fill*tank.capacityM3,density},expected=tankWeight(tank,input);
  for(const unit of ['volume','mass','percent']){
   const actual=editTankContents(tank,{...input,volumeM3:0},unit,'set',tankAmount(tank,input,unit),density);
   for(const key of ['massTonnes','lcg','vcg','tcg','freeSurfaceMomentTransverse'])near(actual[key],expected[key]);
  }
 }
});
test('consumption conserves retained volume and recomputes moments; empty/full FSM transitions remain explicit',()=>{
 const tank=catalog.tanks[0],density=1.025,current={id:tank.id,volumeM3:tank.capacityM3,density};
 for(const unit of ['volume','mass','percent']){
  const half=editTankContents(tank,current,unit,'consume',tankAmount(tank,{...current,volumeM3:current.volumeM3/2},unit),density);
  near(half.massTonnes,current.volumeM3*density/2);assert.ok(Number(half.freeSurfaceMomentTransverse)>0);
  const empty=editTankContents(tank,half.tank,unit,'consume',tankAmount(tank,half.tank,unit),density);
  assert.equal(empty.massTonnes,'0');assert.equal(empty.freeSurfaceMomentTransverse,'0');
 }
 const slack=editTankContents(tank,current,'volume','set',tank.capacityM3-1e-10,density);
 assert.ok(Number(slack.freeSurfaceMomentTransverse)>0);
 for(const args of [['volume','set',-1,density],['percent','set',100.000001,density],['mass','set',Infinity,density],['volume','set',1,0],['volume','consume',current.volumeM3+1e-8,density],['mass','consume',1,1]])assert.throws(()=>editTankContents(tank,current,...args));
});
test('fuel, service and ballast stay separate; starters replace only their scope and never duplicate fixed mass',()=>{
 const clean=cleanLoadingPlan(ship,reference,catalog),fuel=onboardTankCatalog(ship,catalog,'fuel');
 const loaded=applyTankPreset(ship,fuel,clean,'departure');
 for(const w of clean.filter(w=>w.tank&&!fuel.tanks.some(t=>t.id===w.tank.id)))assert.deepEqual(loaded.find(x=>x.id===w.id),w);
 const supplied=applyDepartureOnboard(catalog,loaded),again=applyDepartureOnboard(catalog,supplied);
 assert.deepEqual(again,supplied);assert.equal(again.filter(w=>isFixedWeight(ship,w.id)).length,2);
 for(const w of clean.filter(w=>isFixedWeight(ship,w.id)))assert.deepEqual(again.find(x=>x.id===w.id),w);
});
test('deck changes keep mass, update moments and cargo spaces, and refuse unsupported cargo',()=>{
 const clean=cleanLoadingPlan(ship,reference,catalog),before=evaluateWeights(clean).result;
 const stored=planDeckChange(ship,clean,'stored'),after=evaluateWeights(stored.weights).result;
 near(after.displacementTonnes,before.displacementTonnes);near(after.verticalMoment-before.verticalMoment,269.6*(12.838-6.97));
 assert.equal(stored.surfaces.filter(a=>a.id.startsWith('hold-')).length,2);assert.equal(stored.blocked.length,0);
 assert.deepEqual(planDeckChange(ship,stored.weights,'installed').weights,clean);
 const upper={id:'upper-cargo',name:'Upper cargo',category:'cargo',massTonnes:'1',lcg:'90',tcg:'0',vcg:'8',freeSurfaceMomentTransverse:'0',footprint:{areaId:'hold-1-upper',deckZ:7.2,length:1,width:1,height:1,rotation:0}};
 assert.equal(planDeckChange(ship,[...clean,upper],'stored').blocked[0].id,upper.id);
 assert.throws(()=>planDeckChange({manifest:{resources:[]}},[],'stored'),/no movable/);
});
test('combined onboard changes round-trip and guarded undo cannot overwrite later tank edits',()=>{
 let weights=applyDepartureOnboard(catalog,applyTankPreset(ship,catalog,cleanLoadingPlan(ship,reference,catalog),'departure'));
 const before={scenario:'loading',manualMode:'displacement',manual:{},weights,tweenDeck:'installed',density:1.025};
 const next=planDeckChange(ship,weights,'stored');const state={...before,weights:next.weights,tweenDeck:'stored',cargoArea:next.surfaces[0]};
 const tx=conditionTransaction(before,state);assert.ok(canUndoCondition(tx,state));
 const plan={kind:'cargo-plan',version:1,id:'p04',name:'Onboard test',voyage:'',model:'test',savedAt:new Date().toISOString(),state};
 const parsed=parseCargoPlan(JSON.parse(JSON.stringify(plan)),'test',reference.filter(w=>isFixedWeight(ship,w.id)),ship);
 assert.deepEqual(evaluateWeights(normalizeTankWeights(ship,parsed.state.weights,catalog)).result,evaluateWeights(state.weights).result);
 const tank=catalog.tanks.find(t=>t.group==='hfo'),current=state.weights.find(w=>w.tank?.id===tank.id);
 const consumed=editTankContents(tank,current.tank,'percent','consume',1,current.tank.density);
 weights=state.weights.map(w=>w.id===consumed.id?consumed:w);
 assert.equal(canUndoCondition(tx,{...state,weights}),false);assert.deepEqual(evaluateWeights(tx.before.weights).result,evaluateWeights(before.weights).result);
});
