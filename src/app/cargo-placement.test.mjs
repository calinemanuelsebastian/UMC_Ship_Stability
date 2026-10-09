import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {placeSupportedCargo,intersectsCargo,carriesCargo}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
const {parseFootprint,layoutIssues}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const area={id:'hold-1-lower',name:'Hold 1 Lower',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:1,clearHeight:5};
const box=(id,x=2,y=2)=>({id,name:id,massTonnes:'2',lcg:String(x),tcg:String(y),vcg:'2.2',freeSurfaceMomentTransverse:'0',footprint:{areaId:area.id,length:2,width:2,height:2,rotation:0,deckZ:1}});
test('moving between decks preserves mass and CG offset, and round-trips bottom elevation',()=>{
 const w=box('a'),upper={...area,id:'hold-1-upper',deckZ:7};const moved=placeSupportedCargo(w,[area,upper],[],{x:4,y:3,z:7},false,true);
 assert.equal(moved.massTonnes,'2');assert.equal(moved.vcg,'8.2');assert.equal(moved.footprint.bottomZ,7);assert.deepEqual(parseFootprint(JSON.parse(JSON.stringify(moved.footprint))),moved.footprint);
});
test('actual intersections are rejected but overlap in a projection is allowed',()=>{
 const a=box('a'),b=box('b',6);assert.equal(intersectsCargo(a,b),false);
 assert.throws(()=>placeSupportedCargo(b,[area],[a,b],{x:2,y:2,z:1},false,false),/intersect/);
 assert.doesNotThrow(()=>placeSupportedCargo(b,[area],[a,b],{x:2,y:6,z:1},false,false));
});
test('opt-in stacking requires full support and rejects moving its support',()=>{
 const a=box('a'),b=box('b',6);const stacked=placeSupportedCargo(b,[area],[a,b],{x:2,y:2,z:3},true,false);
 assert.equal(stacked.footprint.bottomZ,3);assert.equal(stacked.vcg,'4.2');assert.equal(intersectsCargo(a,stacked),false);assert.equal(layoutIssues([a,stacked],area).length,0);assert.equal(carriesCargo(a,[stacked]),true);
 assert.throws(()=>placeSupportedCargo(a,[area],[a,stacked],{x:5,y:5,z:1},true,false),/supported/);
 assert.throws(()=>placeSupportedCargo(b,[area],[a,b],{x:2.5,y:2,z:3},true,false),/fully supported/);
});
test('stacked height and invalid saved elevations are rejected',()=>{
 const a=box('a'),b=box('b',6);assert.throws(()=>placeSupportedCargo(b,[{...area,clearHeight:3}],[a,b],{x:2,y:2,z:3},true,false),/height/);
 assert.throws(()=>parseFootprint({...a.footprint,bottomZ:.5}),/elevation/);
});
test('explicit stacking builds successive layers with correct mass and CG',async()=>{
 const {stackCargoOn}=await server.ssrLoadModule('/src/app/cargo-placement.ts');
 const a=box('a');const b=stackCargoOn({...a,id:'b'},a,[area],[a]);const c=stackCargoOn({...b,id:'c'},b,[{...area,clearHeight:7}],[a,b]);
 assert.equal(b.footprint.bottomZ,3);assert.equal(c.footprint.bottomZ,5);assert.ok(Math.abs(Number(c.vcg)-6.2)<1e-10);assert.equal([a,b,c].reduce((s,w)=>s+Number(w.massTonnes),0),6);
 assert.equal(intersectsCargo(a,b),false);assert.equal(intersectsCargo(b,c),false);
 assert.throws(()=>stackCargoOn({...c,id:'d'},c,[area],[a,b,c]),/height/);
});
