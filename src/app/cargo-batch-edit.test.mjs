import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {sameCargoType,editCargoBatch}=await server.ssrLoadModule('/src/app/cargo-batch-edit.ts');
const area={id:'hold',name:'Hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:0,clearHeight:8};
const box=(id,x,rotation=0)=>({id,name:'Apples',lcg:String(x),tcg:'3',vcg:'0.6',massTonnes:'2',footprint:{length:2,width:1,height:1,rotation,deckZ:0,bottomZ:0,areaId:'hold'}});
test('same type ignores rotation, position and mass but distinguishes other cargo and dunnage',()=>{
 const a=box('a',3),b={...box('b',8,90),massTonnes:'3'};assert.ok(sameCargoType(a,b));assert.equal(sameCargoType(a,{...b,name:'Drums'}),false);assert.equal(sameCargoType(a,{...b,footprint:{...b.footprint,kind:'dunnage'}}),false);
});
test('batch edits preserve orientations, centres and custom CG offset and do not mutate inputs',()=>{
 const rows=[box('a',3),box('b',8,90),{...box('c',12),name:'Other'}],original=structuredClone(rows);
 const next=editCargoBatch(rows,['a','b'],{massTonnes:4,height:2},[area]);
 assert.equal(next[0].massTonnes,'4');assert.equal(next[1].footprint.rotation,90);assert.equal(next[1].lcg,'8');assert.equal(+next[0].vcg,1.1);assert.deepEqual(next[2],rows[2]);assert.deepEqual(rows,original);
});
test('invalid dimensions reject the entire batch including support changes',()=>{
 const rows=[box('a',3),box('b',6)];assert.throws(()=>editCargoBatch(rows,['a','b'],{length:5},[area]));assert.throws(()=>editCargoBatch(rows,['a'],{massTonnes:-1},[area]));
 const base=box('base',3),top={...box('top',3),vcg:'1.5',footprint:{...base.footprint,bottomZ:1}};
 assert.throws(()=>editCargoBatch([base,top],['base'],{height:.5},[area]));
});
test('batch stackability and top-load changes preserve orientation and can clear a limit',()=>{
 const rows=[box('a',3),box('b',8,90)];
 const updated=editCargoBatch(rows,['a','b'],{stackability:'stackable',maxTopLoadTonnes:5},[area]);
 assert.equal(updated[1].footprint.rotation,90);assert.equal(updated[0].footprint.maxTopLoadTonnes,5);
 const cleared=editCargoBatch(updated,['a'],{stackability:'unstackable',maxTopLoadTonnes:null},[area]);
 assert.equal(cleared[0].footprint.stackability,'unstackable');assert.equal(cleared[0].footprint.maxTopLoadTonnes,undefined);assert.equal(cleared[1].footprint.maxTopLoadTonnes,5);
 assert.throws(()=>editCargoBatch(rows,['a'],{maxTopLoadTonnes:-1},[area]));
});
