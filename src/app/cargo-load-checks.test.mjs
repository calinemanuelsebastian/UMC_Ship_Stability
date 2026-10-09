import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {cargoLoadChecks,surfaceArea}=await server.ssrLoadModule('/src/app/cargo-load-checks.ts');
const {parseArea}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:0,clearHeight:10,uniformLoad:{tonnesPerM2:2,source:'Document page 1'}};
const item=(id,mass,z=0,x=2,length=2)=>({id,name:id,massTonnes:String(mass),lcg:String(x),tcg:'2',vcg:String(z+.5),footprint:{areaId:'hold',deckZ:0,bottomZ:z,length,width:2,height:1,rotation:0}});
test('surface union excludes gaps and never double-counts overlapping regions',()=>{
 assert.equal(surfaceArea([{xMin:0,xMax:2,yMin:0,yMax:2},{xMin:1,xMax:3,yMin:0,yMax:2}]),6);
 assert.equal(surfaceArea([{xMin:0,xMax:1,yMin:0,yMax:1},{xMin:2,xMax:3,yMin:0,yMax:1}]),2);
});
test('cargo and dunnage sum once while stacked mass reaches the floor contact',()=>{
 const base=item('dunnage',1);base.footprint.kind='dunnage';const r=cargoLoadChecks([base,item('cargo',9,1),item('top',10,2)],[area]).surfaces[0];
 assert.equal(r.mass,20);assert.equal(r.average,.2);assert.equal(r.contacts.length,1);assert.equal(r.contacts[0].carriedTonnes,20);assert.equal(r.contacts[0].pressure,5);assert.match(r.status,/Average within/);
});
test('shared supports retain full upper load per contact but do not duplicate surface mass',()=>{
 const r=cargoLoadChecks([item('left',1,0,2),item('right',1,0,4),item('platform',8,1,3,4)],[area]).surfaces[0];assert.equal(r.mass,10);assert.deepEqual(r.contacts.map(c=>c.carriedTonnes),[9,9]);assert.ok(r.contacts.every(c=>c.sharedSupport));
});
test('overloads, missing layouts, removed decks and invalid masses are never reported as complete',()=>{
 assert.equal(cargoLoadChecks([item('heavy',201)],[area]).surfaces[0].status,'Average exceeds uniform limit');
 const w=item('aggregate',2);delete w.footprint;const r=cargoLoadChecks([item('placed',1),w],[area]);assert.deepEqual(r.unlocated,['aggregate']);assert.equal(r.surfaces[0].status,'Incomplete load assessment');
 assert.equal(cargoLoadChecks([item('stored',1)],[area],true).surfaces[0].status,'Incomplete load assessment');
 assert.equal(cargoLoadChecks([item('floating',2,3)],[area]).surfaces[0].unsupported.length,1);
 const invalid=item('invalid',1);invalid.massTonnes='';assert.equal(cargoLoadChecks([invalid],[area]).surfaces[0].average,undefined);
});
test('load limits survive surface parsing and reject malformed values',()=>{
 assert.deepEqual(parseArea(area).uniformLoad,area.uniformLoad);assert.throws(()=>parseArea({...area,uniformLoad:{tonnesPerM2:-1,source:'bad'}}));
 const unknown={...area};delete unknown.uniformLoad;assert.equal(cargoLoadChecks([],[unknown]).surfaces[0].status,'No documented uniform limit');
});
