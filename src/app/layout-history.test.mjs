import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {LayoutHistory}=await server.ssrLoadModule('/src/app/layout-history.ts');
const state=n=>[{id:'cargo',massTonnes:String(n)}];
test('multiple undo and redo steps restore snapshots without aliasing',()=>{
 const h=new LayoutHistory();h.record(state(0),state(1),'hold');h.record(state(1),state(2),'hold');
 const one=h.step(state(2),'hold');assert.deepEqual(one,state(1));one[0].massTonnes='999';
 assert.deepEqual(h.step(state(1),'hold'),state(0));
 assert.deepEqual(h.step(state(0),'hold',true),state(1));
 assert.deepEqual(h.step(state(1),'hold',true),state(2));
});
test('new edits discard redo, and external changes or deck changes cannot be overwritten',()=>{
 const h=new LayoutHistory();h.record(state(0),state(1),'hold');h.step(state(1),'hold');h.record(state(0),state(3),'hold');
 assert.equal(h.canRedo(state(3),'hold'),false);
 assert.equal(h.step(state(9),'hold'),undefined);assert.equal(h.step(state(3),'stored'),undefined);
 h.record(state(9),state(10),'hold');assert.deepEqual(h.step(state(10),'hold'),state(9));assert.equal(h.canUndo(state(9),'hold'),false);
});
test('history keeps at most twenty actions and ignores unchanged edits',()=>{
 const h=new LayoutHistory();for(let i=0;i<25;i++)h.record(state(i),state(i+1),'hold');h.record(state(25),state(25),'hold');
 let current=state(25),count=0;while(h.canUndo(current,'hold')){current=h.step(current,'hold');count++;}
 assert.equal(count,20);assert.deepEqual(current,state(5));
});
