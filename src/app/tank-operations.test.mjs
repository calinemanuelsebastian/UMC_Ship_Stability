import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {tankWeight,normalizeTankWeights,loadTankCatalog,roleOf,isCargo,isFixedWeight}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const {parseScenario,modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));
const catalog=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/tanks.json','utf8'));
const source=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/weights.json','utf8'));
const ship={baseUrl:'/test/',manifest};const tank=catalog.tanks.find(t=>t.id==='004');
const input=(volumeM3,density=1.025)=>({id:tank.id,volumeM3,density});
test('all 68 tank tables cover zero to the documented capacity',async()=>{
 const fetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(catalog));
 try{assert.equal((await loadTankCatalog(ship)).tanks.length,68);}finally{globalThis.fetch=fetch;}
 for(const t of catalog.tanks){assert.equal(Number(tankWeight(t,{id:t.id,volumeM3:0,density:1}).massTonnes),0);assert.equal(Number(tankWeight(t,{id:t.id,volumeM3:t.capacityM3,density:1}).massTonnes),t.capacityM3);}
});
test('volume capacity is enforced independently of liquid density',()=>{
 for(const density of [1,.89,1.025,1.2]){assert.throws(()=>tankWeight(tank,input(tank.capacityM3+.0001,density)),/volume/);assert.doesNotThrow(()=>tankWeight(tank,input(tank.capacityM3,density)));}
 for(const v of [-1,NaN,Infinity])assert.throws(()=>tankWeight(tank,input(v)));
 for(const rho of [0,-1,NaN,Infinity])assert.throws(()=>tankWeight(tank,input(1,rho)));
});
test('table row and AP conversion: 004 at 17.584 m3',()=>{
 const w=tankWeight(tank,input(17.584));assert.ok(Math.abs(Number(w.massTonnes)-18.0236)<1e-9);
 assert.ok(Math.abs(Number(w.lcg)-(40.101+60.85))<1e-9);assert.equal(Number(w.tcg),-3.124);assert.equal(Number(w.vcg),.334);assert.equal(Number(w.freeSurfaceMomentTransverse),54.7*1.025);
});
test('ballast density changes mass and FSM, not volume or centres; surrounding density does not enter tank calculation',()=>{
 const a=tankWeight(tank,input(17.584,1)),b=tankWeight(tank,input(17.584,1.025));
 assert.equal(Number(b.massTonnes),Number(a.massTonnes)*1.025);assert.equal(Number(b.freeSurfaceMomentTransverse),Number(a.freeSurfaceMomentTransverse)*1.025);
 for(const k of ['lcg','tcg','vcg'])assert.equal(a[k],b[k]);
 const changed={...ship,manifest:{...manifest,defaultCondition:{...manifest.defaultCondition,waterDensity:.998}}};
 assert.deepEqual(normalizeTankWeights(changed,[b],catalog),normalizeTankWeights(ship,[b],catalog));
});
test('empty and pressed-full FSM are zero; just below full remains slack',()=>{
 assert.equal(Number(tankWeight(tank,input(0)).freeSurfaceMomentTransverse),0);
 assert.equal(Number(tankWeight(tank,input(tank.capacityM3)).freeSurfaceMomentTransverse),0);
 assert.ok(Number(tankWeight(tank,input(tank.capacityM3-.00001)).freeSurfaceMomentTransverse)>80);
});
test('restoration recomputes derived mass and rejects overfill, unknown IDs and double-counting',()=>{
 const w=tankWeight(tank,input(10));assert.deepEqual(normalizeTankWeights(ship,[{...w,massTonnes:'999999'}],catalog),[w]);
 assert.throws(()=>normalizeTankWeights(ship,[{...w,tank:input(tank.capacityM3+1)}],catalog));
 assert.throws(()=>normalizeTankWeights(ship,[w,w],catalog));
 assert.throws(()=>normalizeTankWeights(ship,[w,source.find(w=>roleOf(ship,w)==='ballast')],catalog),/legacy/);
 assert.throws(()=>normalizeTankWeights(ship,[{...w,tank:{...w.tank,id:'unknown'}}],catalog));
 const plan={version:1,id:'tank-test',name:'Tank test',model:modelSignature(ship),savedAt:new Date().toISOString(),state:{scenario:'loading',manualMode:'displacement',manual:{},weights:[w]}};
 assert.deepEqual(parseScenario(JSON.parse(JSON.stringify(plan)),modelSignature(ship)).state.weights[0].tank,w.tank);
});
test('cargo-only geometry excludes ballast, fuel and static lightship without removing their mass rows',()=>{
 assert.equal(source.filter(w=>isCargo(ship,w)).length,24);
 for(const w of source.filter(w=>['ballast','hfo','mdo','freshwater','fixed'].includes(roleOf(ship,w))))assert.equal(isCargo(ship,w),false);
 assert.equal(source.filter(w=>isFixedWeight(ship,w.id)).length,2);assert.equal(source.length,47);
});

test('every documented tank knot and intermediate volume conserves liquid moments',()=>{
 const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8*Math.max(1,Math.abs(expected)),`${actual} vs ${expected}`);
 for(const t of catalog.tanks){
  for(let i=1;i<t.rows.length;i++){
   const b=t.rows[i],a=t.rows[i-1];
   for(const fraction of [0.5,1]){
    const volume=a[0]+fraction*(b[0]-a[0]),w=tankWeight(t,{id:t.id,volumeM3:volume,density:.89});
    near(Number(w.massTonnes),volume*.89);
    for(const [j,key] of [[1,'lcg'],[2,'tcg'],[3,'vcg']])near(Number(w[key])*volume,a[0]*a[j]+fraction*(b[0]*b[j]-a[0]*a[j]));
    near(Number(w.freeSurfaceMomentTransverse),volume===t.capacityM3?0:(a[4]+fraction*(b[4]-a[4]))*.89);
   }
  }
 }
});
test('tank catalogue rejects duplicate volumes, missing capacity, nonfinite values and negative inertia',async()=>{
 const original=globalThis.fetch;
 try{for(const mutate of [t=>t.rows[1][0]=0,t=>t.rows.pop(),t=>t.rows[1][2]=null,t=>t.rows[1][4]=-1]){
  const c=structuredClone(catalog);mutate(c.tanks[0]);globalThis.fetch=async()=>new Response(JSON.stringify(c));
  await assert.rejects(()=>loadTankCatalog(ship));
 }}finally{globalThis.fetch=original;}
});
