import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {spacingTarget}=await server.ssrLoadModule('/src/app/cargo-spacing.ts');
const {pasteCargoGroup}=await server.ssrLoadModule('/src/app/copy-cargo.ts');
const box=(id,x,y=2)=>({id,name:id,lcg:String(x),tcg:String(y),vcg:'.5',footprint:{length:1,width:1,height:1,rotation:0,deckZ:0,bottomZ:0,areaId:'hold'}});
test('exact face spacing preserves the perpendicular position',()=>{const a=[box('a',2),box('b',3)],b=[box('ref',8)];assert.deepEqual(spacingTarget(a,b,.35,'forward'),{x:9.35,y:2,z:0});assert.deepEqual(spacingTarget(a,b,.5,'aft'),{x:5.5,y:2,z:0});assert.equal(spacingTarget(a,b,.5,'port').y,.5);});
test('rejects invalid gaps and overlapping selections',()=>{const a=[box('a',2)];assert.throws(()=>spacingTarget(a,a,.1,'forward'));assert.throws(()=>spacingTarget(a,[box('b',4)],-1,'forward'));});
test('paste respects a gap smaller than the grid step',()=>{const a=box('a',2);const next=pasteCargoGroup([a],{id:'hold',name:'Hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:0,clearHeight:8},[a],()=> 'copy',true,.35);assert.ok(Math.abs(+next[0].lcg-3.35)<1e-8);});
test('pointer paste centers the complete group exactly and never searches elsewhere',()=>{
 const sources=[box('a',2),box('b',4)];const area={id:'hold',name:'Hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:0,clearHeight:8};let id=0;
 const next=pasteCargoGroup(sources,area,[],()=>`copy${id++}`,true,.1,{x:8.37,y:5.23});
 assert.ok(Math.abs((+next[0].lcg+Number(next[1].lcg))/2-8.37)<1e-8);assert.equal(+next[0].tcg,5.23);assert.equal(+next[1].lcg-Number(next[0].lcg),2);
 assert.throws(()=>pasteCargoGroup(sources,area,[box('obstacle',7.37,5.23)],()=>`copy${id++}`,false,0,{x:8.37,y:5.23}));
 assert.throws(()=>pasteCargoGroup(sources,area,[],()=>`copy${id++}`,false,0,{x:0,y:5}));
});
