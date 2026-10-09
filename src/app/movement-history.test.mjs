import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
after(()=>server.close());
const {MovementHistory}=await server.ssrLoadModule('/src/app/movement-history.ts');
const weights=(lcg='50',tcg='0')=>[{id:'cargo',lcg,tcg}];
test('one drag groups multiple live updates into one undo step',()=>{
 const h=new MovementHistory();h.begin();h.record('cargo','lcg','50','51');h.record('cargo','lcg','51','52');h.record('cargo','lcg','52','53');h.end();
 assert.deepEqual(h.undo(weights('53')),{id:'cargo',axis:'lcg',before:'50',after:'53'});
 assert.equal(h.canUndo(weights()),false);
});
test('separate edits and axes undo independently and preserve reset baselines',()=>{
 const h=new MovementHistory();h.record('cargo','lcg','50','51');h.record('cargo','tcg','0','2');
 assert.equal(h.undo(weights('51','2')).axis,'tcg');assert.equal(h.undo(weights('51')).before,'50');
 assert.equal(h.initial('cargo','lcg'),'50');assert.equal(h.initial('cargo','tcg'),'0');
});
test('ending a view interaction retains history; net-zero movement is not undoable',()=>{
 const h=new MovementHistory();h.begin();h.record('cargo','lcg','50','55');h.end();
 assert.equal(h.canUndo(weights('55')),true);
 h.begin();h.record('cargo','lcg','55','56');h.record('cargo','lcg','56','55');h.end();
 assert.equal(h.undo(weights('55')).before,'50');
});
test('external edits or deleted weights are not overwritten by stale history',()=>{
 const h=new MovementHistory();h.record('cargo','lcg','50','55');
 assert.equal(h.canUndo(weights('70')),false);assert.equal(h.undo(weights('70')),undefined);
 h.record('cargo','tcg','0','2');assert.equal(h.undo([]),undefined);
});
