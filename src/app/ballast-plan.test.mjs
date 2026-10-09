import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {tankWeight,loadTankCatalog,cleanLoadingPlan}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const {cargoSurfaces}=await server.ssrLoadModule('/src/app/cargo-surfaces.ts');
const {modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const root='public/built-in-ship-models/training-pontoon-100x20/';
const manifest=JSON.parse(await readFile(root+'manifest.json','utf8')),catalog=JSON.parse(await readFile(root+'loading/tanks.json','utf8'));
const ship={manifest,baseUrl:'/test/'};
test('Vectis diagram accounts for every ballast tank, retaining sounding capacities',async()=>{
 const c=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/tanks.json','utf8'));
 const tanks=c.tanks.filter(t=>t.group==='ballast');assert.equal(tanks.length,35);
 assert.ok(tanks.every(t=>t.plan&&c.arrangement.layers.includes(t.plan.layer)));
 assert.equal(new Set(tanks.map(t=>t.id)).size,35);assert.equal(tanks.find(t=>t.id==='001').capacityM3,188.09);
 assert.equal(tanks.filter(t=>t.plan.layer==='Double bottom').length,14);
});
test('pontoon slack tank uses exact rectangular CG and free surface at arbitrary volume',()=>{
 const t=catalog.tanks[0],v=123.456,rho=1.017,w=tankWeight(t,{id:t.id,volumeM3:v,density:rho});
 assert.equal(+w.massTonnes,v*rho);assert.equal(+w.vcg,v/320/2);assert.equal(+w.lcg,25);assert.equal(+w.tcg,-5);
 assert.equal(+w.freeSurfaceMomentTransverse,40*8**3/12*rho);
 for(const volumeM3 of [0,640])assert.equal(+tankWeight(t,{id:t.id,volumeM3,density:rho}).freeSurfaceMomentTransverse,0);
 assert.throws(()=>tankWeight(t,{id:t.id,volumeM3:641,density:.8}),/volume/);
});
test('pontoon starts with lightship and empty tanks and has a deck in every configuration',()=>{
 const ws=cleanLoadingPlan(ship,[{id:'lightship',massTonnes:'4000'},{id:'cargo',massTonnes:'2150'}],catalog);
 assert.equal(ws.length,5);assert.ok(!ws.some(w=>w.id==='cargo'));assert.equal(ws.reduce((n,w)=>n+Number(w.massTonnes),0),4000);
 const deck=cargoSurfaces(ship)[0];assert.equal(deck.id,'pontoon-deck');assert.equal(deck.deckZ,8);assert.equal(deck.clearHeight,10);
 assert.deepEqual(cargoSurfaces(ship,'stored'),[deck]);
 const old=structuredClone(ship);old.manifest.resources=old.manifest.resources.filter(r=>!['loading.tank-catalog','loading.cargo-surfaces','loading.operational-weights'].includes(r.kind));
 assert.equal(modelSignature(ship),modelSignature(old));
});
test('tank catalogue rejects mismatched box volume and invalid plan geometry',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json(catalog);assert.equal((await loadTankCatalog(ship)).tanks.length,4);
  for(const mutate of [c=>c.tanks[0].box.height=3,c=>c.tanks[0].plan.polygon=[[1,2]],c=>c.arrangement.outline=[[1]],c=>c.tanks[0].fullCentre=[0]]){
   const bad=structuredClone(catalog);mutate(bad);globalThis.fetch=async()=>Response.json(bad);await assert.rejects(loadTankCatalog(ship));
  }
 }finally{globalThis.fetch=original;}
});
