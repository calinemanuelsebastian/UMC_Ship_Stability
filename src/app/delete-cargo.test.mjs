import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {deleteCargoSelection}=await server.ssrLoadModule('/src/app/delete-cargo.ts');
const box=(id,z=0)=>({id,massTonnes:'2',lcg:'2',tcg:'2',footprint:{length:1,width:1,height:1,rotation:0,bottomZ:z,deckZ:0}});
test('deletes complete stack while preserving protected weights and original snapshot',()=>{const weights=[box('base'),box('top',1),{id:'fixed',massTonnes:'50'}];const before=structuredClone(weights);const next=deleteCargoSelection(weights,['base','top','fixed'],['base','top']);assert.deepEqual(next,[weights[2]]);assert.deepEqual(weights,before);});
test('rejects removal of support beneath unselected cargo',()=>{const weights=[box('base'),box('top',1)];assert.throws(()=>deleteCargoSelection(weights,['base'],['base','top']),/supported/);assert.deepEqual(deleteCargoSelection(weights,['top'],['base','top']),[weights[0]]);});
