import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {applyTankPreset,applyDepartureOnboard}=await server.ssrLoadModule('/src/app/departure-presets.ts');
const {tankWeight}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const catalog=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/tanks.json','utf8')),manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8')),ship={manifest};
const ballast=tankWeight(catalog.tanks[0],{id:'001',volumeM3:50,density:1});
const initial=[{id:'cargo',category:'cargo',massTonnes:'100'},ballast,{id:'Calc_G_Cargo-69',massTonnes:'241.668'},{id:'Calc_G_Cargo-72',massTonnes:'17.647'},{id:'Calc_G_Cargo-68',massTonnes:'3660'}];
test('departure covers all 33 liquid tanks, recalculates at catalog capacities, retains ballast and cargo',()=>{
 const ws=applyTankPreset(ship,catalog,initial,'departure');assert.equal(ws.filter(w=>w.tank).length,34);assert.equal(ws.find(w=>w.tank?.id==='038').tank.volumeM3,33.927);assert.equal(ws.find(w=>w.tank?.id==='060').tank.density,.9);assert.equal(ws.find(w=>w.tank?.id==='074').massTonnes,'0');assert.deepEqual(ws.find(w=>w.id===ballast.id),ballast);assert.equal(ws.find(w=>w.id==='cargo').massTonnes,'100');assert.ok(!ws.some(w=>w.id==='Calc_G_Cargo-72'));assert.equal(ws.filter(w=>w.id==='departure-winch-oil-65').length,1);assert.deepEqual(applyTankPreset(ship,catalog,ws,'departure'),ws);
});
test('emptying liquid section retains density, other weights and ballast but removes winch liquid reference',()=>{
 const full=applyTankPreset(ship,catalog,initial,'departure'),empty=applyTankPreset(ship,catalog,full,'empty');assert.ok(empty.filter(w=>w.tank&&w.tank.id!=='001').every(w=>w.massTonnes==='0'));assert.equal(empty.find(w=>w.tank?.id==='060').tank.density,.9);assert.ok(!empty.some(w=>w.id==='departure-winch-oil-65'));assert.equal(empty.find(w=>w.id===ballast.id).massTonnes,'50');
});
test('crew and stores replace existing entries once and leave unrelated weights untouched',()=>{
 const ws=applyDepartureOnboard(catalog,[...initial,{id:'Calc_G_Cargo-75',massTonnes:'9'},{id:'user-stores',category:'other',massTonnes:'3'}]);assert.equal(ws.find(w=>w.id==='Calc_G_Cargo-75').massTonnes,'2');assert.equal(ws.find(w=>w.id==='Calc_G_Cargo-76').massTonnes,'10');assert.equal(ws.find(w=>w.id==='user-stores').massTonnes,'3');assert.deepEqual(applyDepartureOnboard(catalog,ws),ws);
});
test('tank LCG and VCG change with filling and density determines volume for a given mass',()=>{
 const t=catalog.tanks.find(t=>t.id==='004');const a=tankWeight(t,{id:t.id,volumeM3:5,density:1}),b=tankWeight(t,{id:t.id,volumeM3:30,density:1});assert.notEqual(a.lcg,b.lcg);assert.notEqual(a.vcg,b.vcg);assert.ok(+b.vcg>+a.vcg);assert.throws(()=>applyTankPreset(ship,catalog,initial,'departure',true),/No departure allocation/);
});
