import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());const {cargoGapPairs}=await server.ssrLoadModule('/src/app/cargo-gap-pairs.ts');
const box=(id,x,y=2,z=0)=>({id,lcg:String(x),tcg:String(y),vcg:String(z+.5),footprint:{length:1,width:1,height:1,rotation:0,areaId:'hold',deckZ:0,bottomZ:z}});
test('only nearby nearest facing neighbours are proposed, not distant aisles or diagonals',()=>{const a=box('a',1),b=box('b',2.2),c=box('c',3.4);assert.deepEqual(cargoGapPairs([a,b,c,box('far',9),box('diagonal',1.5,5)],.25).map(p=>p.map(w=>w.id)),[['a','b'],['b','c']]);});
test('separates levels, holds and dunnage',()=>{const a=box('a',1),b=box('b',2.2);assert.equal(cargoGapPairs([a,{...b,footprint:{...b.footprint,areaId:'other'}},box('upper',2.2,2,1)],.25).length,0);assert.throws(()=>cargoGapPairs([a,b],-1));});
test('one thousand aligned units produce 999 spacer candidates',()=>{const units=Array.from({length:1000},(_,i)=>box(String(i),1+i*1.1));assert.equal(cargoGapPairs(units,.2).length,999);});

test('staggered rows retain both neighbours facing a cargo edge',()=>{
 const units=[box('left',1,2),box('lower',2.2,1.5),box('upper',2.2,2.5)];
 assert.deepEqual(cargoGapPairs(units,.25).map(p=>p.map(w=>w.id)),[['left','lower'],['left','upper']]);
});
