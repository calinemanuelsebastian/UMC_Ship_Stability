import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {onboardTankCatalog,loadingSteps}=await server.ssrLoadModule('/src/app/loading-workflow.ts');
const {applyTankPreset}=await server.ssrLoadModule('/src/app/departure-presets.ts');
const {parseCargoPlan}=await server.ssrLoadModule('/src/app/cargo-plans.ts');
const {modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const {tankWeight}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));const ship={manifest};
const {conditionTransaction,canUndoCondition}=await server.ssrLoadModule('/src/app/condition-transaction.ts');
test('historical-format plan imports without losing weights; new plan roundtrips; changed ship rejected',async()=>{
 const old=JSON.parse(await readFile('src/app/fixtures/pre-capacity-plan.json','utf8'));
 const restored=parseCargoPlan(old,modelSignature(ship),[]);
 assert.deepEqual(restored.state.weights,old.state.weights);assert.equal(restored.state.capacity,undefined);
 const current={...restored,state:{...restored.state,capacity:{limitSource:'',reserve:0,supportAllowance:0,areaId:'',method:'package',unitMass:2}}};
 assert.deepEqual(parseCargoPlan(JSON.parse(JSON.stringify(current)),modelSignature(ship),[]).state,current.state);
 const other=structuredClone(ship);other.manifest.principalDimensions.lbp+=1;
 assert.throws(()=>parseCargoPlan(old,modelSignature(other),[]),/different model/);
});
test('fuel and service presets change only their own tank groups',()=>{
 const tank=(id,group)=>({id,name:id,group,capacityM3:10,defaultDensity:1,fullCentre:[1,0,1],rows:[[0,1,0,1,0],[10,1,0,1,0]]});
 const catalog={version:1,source:'test',tanks:[tank('f','mdo'),tank('s','freshwater'),tank('b','ballast')],departure:{source:'test',note:'',tanks:['f','s','b'].map(id=>({id,fillPercent:50,density:1,sourceMassTonnes:5})),onboard:[]}};
 const initial=catalog.tanks.map(t=>tankWeight(t,{id:t.id,volumeM3:2,density:1}));
 const fuel=applyTankPreset(ship,onboardTankCatalog(ship,catalog,'fuel'),initial,'departure');
 assert.equal(fuel.find(w=>w.tank.id==='f').massTonnes,'5');assert.deepEqual(fuel.find(w=>w.tank.id==='s'),initial[1]);assert.deepEqual(fuel.find(w=>w.tank.id==='b'),initial[2]);
 const service=applyTankPreset(ship,onboardTankCatalog(ship,catalog,'service'),fuel,'empty');
 assert.equal(service.find(w=>w.tank.id==='s').massTonnes,'0');assert.equal(service.find(w=>w.tank.id==='f').massTonnes,'5');assert.deepEqual(service.find(w=>w.tank.id==='b'),initial[2]);
 assert.deepEqual(loadingSteps.map(([id])=>id),['onboard','capacity','layout','ballast','weights']);
});
test('whole-condition undo cannot overwrite later edits and owns immutable before snapshot',()=>{
 const before={scenario:'loading',weights:[],manual:{},manualMode:'displacement',density:1.025};
 const after={...before,density:1};const edit=conditionTransaction(before,after);before.density=2;
 assert.equal(edit.before.density,1.025);assert.equal(canUndoCondition(edit,after),true);
 assert.equal(canUndoCondition(edit,{...after,density:.99}),false);
 assert.equal(canUndoCondition(edit,{...after,capacity:{reserve:1}}),false);
 assert.equal(canUndoCondition(edit,{density:1,manualMode:'displacement',manual:{},weights:[],scenario:'loading'}),true);
});
test('scoped real-vessel departure preserves reference liquids and matches combined preset exactly once',async()=>{
 const catalog=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/tanks.json','utf8'));
 const initial=JSON.parse(await readFile('src/app/fixtures/pre-capacity-plan.json','utf8')).state.weights;
 const full=applyTankPreset(ship,catalog,initial,'departure');
 const fuel=applyTankPreset(ship,onboardTankCatalog(ship,catalog,'fuel'),initial,'departure');
 const combined=applyTankPreset(ship,onboardTankCatalog(ship,catalog,'service'),fuel,'departure');
 const ordered=ws=>[...ws].sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(ordered(combined),ordered(full));
 assert.equal(combined.filter(w=>w.id==='departure-winch-oil-65').length,1);
});

test('loading completion leads to inspection and plans are outside the sequence',async()=>{
 const {nextLoadingStep}=await server.ssrLoadModule('/src/app/loading-workflow.ts');
 assert.deepEqual(nextLoadingStep('weights'),{page:'view3d',label:'Continue to 3D inspection'});
 assert.equal(nextLoadingStep('plans'),undefined);
 assert.equal(nextLoadingStep('ballast').section,'weights');
 assert.equal(nextLoadingStep('tanks').section,'capacity');
});
