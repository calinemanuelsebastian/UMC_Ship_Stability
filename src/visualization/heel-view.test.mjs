import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
after(()=>server.close());
const {computeHeelView}=await server.ssrLoadModule('/src/visualization/heel-view.ts');
const {computeTrimView}=await server.ssrLoadModule('/src/visualization/trim-view.ts');
const {computeStabilityCurves}=await server.ssrLoadModule('/src/core/stability/compute-stability-curves.ts');
const {heelEquilibrium}=await server.ssrLoadModule('/src/core/stability/heel-equilibrium.ts');
const {illustrativeAttitudePose}=await server.ssrLoadModule('/src/visualization/ship-scene-data.ts');
const {mountShipBundle}=await server.ssrLoadModule('/src/app/ship-package.ts');
test('Vectis heel view reuses initial trim and corrected equilibrium without refetching',async()=>{
 const root='validation-references/reviewed-apples-vessel/',manifest=JSON.parse(await readFile(root+'manifest.json','utf8')),files={};
 for(const r of manifest.resources)if(r.path)files[r.path]={encoding:'utf8',data:await readFile(root+r.path,'utf8')};
 const ship=mountShipBundle({manifest,files}),original=globalThis.fetch;let fetches=0;
 globalThis.fetch=(...args)=>{fetches++;return original(...args);};
 try{
  const condition={displacementTonnes:13201.307,waterDensity:1.025,vcg:4.647,lcg:58.731,tcg:.004};
  const curve=await computeStabilityCurves(ship,condition,{longitudinalFsm:0});
  const trim=await computeTrimView(ship,condition,0),before=fetches;
  const view=await computeHeelView(ship,condition,0);
  assert.equal(view.initialTrimReference,true);
  assert.equal(view.heelDeg,heelEquilibrium(curve).equilibrium.heelDeg);
  assert.equal(view.draftAft,trim.draftAft);assert.equal(view.draftForward,trim.draftForward);
  assert.notEqual(view.trimDeg,0);assert.equal(view.trimDeg,trim.trimDeg);assert.equal(fetches,before);
  await assert.rejects(computeHeelView(ship,{...condition,tcg:-.1},0),/equilibrium/);
 }finally{globalThis.fetch=original;ship.release();}
});
test('reconstructed attitude retains initial pitch and reference pivot at signed heel',()=>{
 for(const heelDeg of [-60,0,25,90]){
  const pose=illustrativeAttitudePose({length:100,beam:20,depth:10,schematic:true},{draftAft:4,draftForward:6,heelDeg});
  assert.equal(pose.pitch,-Math.atan(.02));
  assert.ok(Math.abs(5*Math.cos(pose.pitch)*Math.cos(pose.angle)+pose.heave)<1e-12);
 }
});
test('reconstructed imposed trim covers both directions without rectangular buoyancy',()=>{
 const hull={length:121.7,beam:17.4,depth:10,schematic:true};
 for(const teachingTrimDeg of [-45,-30,0,30,45]){
  const pose=illustrativeAttitudePose(hull,{draftAft:5,draftForward:5,heelDeg:0,teachingTrimDeg});
  assert.equal(pose.pitch,-teachingTrimDeg*Math.PI/180);
  assert.ok(Math.abs(5*Math.cos(pose.pitch)+pose.heave)<1e-12);
  assert.equal(pose.angle,0);
 }
 for(const teachingTrimDeg of [NaN,46,-46])assert.throws(()=>illustrativeAttitudePose(hull,{draftAft:5,draftForward:5,heelDeg:0,teachingTrimDeg}),/Imposed trim/);
});
