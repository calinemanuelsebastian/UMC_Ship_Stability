import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {pasteCargo}=await server.ssrLoadModule('/src/app/copy-cargo.ts');
const {layoutIssues}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:1,clearHeight:5};
const source={id:'a',name:'Pallet',massTonnes:'2',lcg:'1',tcg:'1',vcg:'2',freeSurfaceMomentTransverse:'0',footprint:{areaId:'hold',length:2,width:2,height:2,rotation:0,deckZ:1}};
test('pasting repeatedly adds independent cargo with preserved mass and no overlap',()=>{
 const b=pasteCargo(source,area,[source],'b',true),c=pasteCargo(source,area,[source,b],'c',true);
 assert.equal(b.massTonnes,'2');assert.equal(c.massTonnes,'2');assert.equal(layoutIssues([source,b,c],area).length,0);assert.notDeepEqual([b.lcg,b.tcg],[c.lcg,c.tcg]);assert.notEqual(b.footprint,source.footprint);
});
test('paste to another deck changes KG by deck elevation difference and enforces clear height',()=>{
 const b=pasteCargo(source,{...area,id:'upper',deckZ:7},[],'b',true);assert.equal(b.vcg,'8');assert.equal(b.footprint.areaId,'upper');assert.equal(b.footprint.deckZ,7);
 assert.throws(()=>pasteCargo(source,{...area,clearHeight:1},[],'b',true),/No free/);
});
test('full area rejects paste instead of adding overlapping mass',()=>{
 assert.throws(()=>pasteCargo(source,{...area,xMax:2,yMax:2},[source],'b',false),/No free/);
});
