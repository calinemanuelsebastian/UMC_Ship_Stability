import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {removeDunnage}=await server.ssrLoadModule('/src/app/remove-dunnage.ts');
const {LayoutHistory}=await server.ssrLoadModule('/src/app/layout-history.ts');
const box=(id,x,kind)=>({id,lcg:String(x),tcg:'2',vcg:'.5',massTonnes:'1',footprint:{length:1,width:1,height:1,rotation:0,areaId:'hold',deckZ:0,bottomZ:0,...(kind?{kind}:{})}});
test('removes all editable dunnage without cargo and supports undo/redo',()=>{
 const weights=[box('cargo',1),box('d1',2,'dunnage'),box('d2',5,'dunnage'),box('fixed',8,'dunnage')];
 const next=removeDunnage(weights,[],['cargo','d1','d2']);assert.deepEqual(next.map(w=>w.id),['cargo','fixed']);
 const h=new LayoutHistory();h.record(weights,next,'ship');assert.deepEqual(h.step(next,'ship'),weights);assert.deepEqual(h.step(weights,'ship',true),next);
});
test('selection removes only touching or explicitly selected dunnage',()=>{
 const weights=[box('cargo',1),box('d1',2,'dunnage'),box('d2',5,'dunnage')],ids=weights.map(w=>w.id);
 assert.deepEqual(removeDunnage(weights,['cargo'],ids).map(w=>w.id),['cargo','d2']);
 assert.deepEqual(removeDunnage(weights,['d2'],ids).map(w=>w.id),['cargo','d1']);
 assert.equal(removeDunnage(weights,['unknown'],ids).length,3);
});
test('cannot remove supports carrying cargo',()=>{
 const support=box('d',2,'dunnage'),load=box('load',2);load.footprint.bottomZ=1;load.vcg='1.5';
 assert.throws(()=>removeDunnage([support,load],[],['d','load']),/supported/);
});
