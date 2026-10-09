import {test,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {CargoNeighbours}=await server.ssrLoadModule('/src/app/cargo-neighbours.ts');const {cargoBounds}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
const box=(id,x,y,length=1)=>({id,lcg:String(x),tcg:String(y),footprint:{length,width:1,height:1,rotation:0}});
test('broad phase never loses overlap or edge contact, including negative coordinates and insertions',()=>{
 const weights=Array.from({length:100},(_,i)=>box(String(i),(i%10)-5,Math.floor(i/10)-5));const index=new CargoNeighbours(weights);
 const added=box('added',0,0,4);index.add(added);weights.push(added);
 for(const query of weights){const b=cargoBounds(query),found=new Set(index.query(b).map(w=>w.id));for(const w of weights){const c=cargoBounds(w);if(Math.min(b.xMax,c.xMax)>=Math.max(b.xMin,c.xMin)-1e-8&&Math.min(b.yMax,c.yMax)>=Math.max(b.yMin,c.yMin)-1e-8)assert.ok(found.has(w.id));}}
 const huge=box('huge',0,0,10000);index.add(huge);assert.ok(index.query(cargoBounds(weights[0])).some(w=>w.id==='huge'));
});
