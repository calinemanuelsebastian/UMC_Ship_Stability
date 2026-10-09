import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {pasteCargoGroup}=await server.ssrLoadModule('/src/app/copy-cargo.ts');
const area={id:'a',name:'Hold',xMin:0,xMax:20,yMin:0,yMax:10,deckZ:1,clearHeight:5};
const box=(id,z,height=1)=>({id,name:id,massTonnes:'2',lcg:'3',tcg:'3',vcg:String(z+.4),footprint:{length:2,width:2,height,rotation:0,deckZ:1,bottomZ:z,areaId:'a'}});
let n=0;const ids=()=>`copy-${n++}`;
test('copies a cargo and dunnage stack as one rigid arrangement across decks',()=>{
 const sources=[box('bottom',1),{...box('d',2,.1),footprint:{...box('d',2,.1).footprint,kind:'dunnage',dunnage:{material:'Pine',densityKgM3:470,massMode:'manual'}}},box('top',2.1)];
 const original=JSON.stringify(sources);const next=pasteCargoGroup(sources,{...area,id:'b',deckZ:7},[],ids,true);
 assert.equal(next.length,3);assert.equal(new Set(next.map(w=>w.id)).size,3);assert.equal(JSON.stringify(sources),original);
 for(let i=0;i<3;i++){assert.ok(Math.abs(next[i].footprint.bottomZ-sources[i].footprint.bottomZ-6)<1e-10);assert.ok(Math.abs(Number(next[i].vcg)-Number(sources[i].vcg)-6)<1e-10);assert.equal(next[i].massTonnes,'2');assert.equal(next[i].lcg,next[0].lcg);}
 assert.equal(next[1].footprint.kind,'dunnage');assert.equal(next[1].footprint.dunnage.massMode,'manual');
});
test('preserves horizontal spacing and refuses overlaps or unsupported incomplete structures',()=>{
 const a=box('a',1),b={...box('b',1),lcg:'6'};const next=pasteCargoGroup([a,b],area,[a,b],ids,true);assert.equal(Number(next[1].lcg)-Number(next[0].lcg),3);
 assert.throws(()=>pasteCargoGroup([a,box('overlap',1)],area,[],ids,true),/No free/);
 assert.throws(()=>pasteCargoGroup([a,box('floating',3)],area,[],ids,true),/No free/);
 assert.throws(()=>pasteCargoGroup([a],{...area,clearHeight:.5},[],ids,true),/No free/);
 assert.throws(()=>pasteCargoGroup([a,{...b,footprint:{...b.footprint,deckZ:7}}],area,[],ids,true),/one loading/);
});
