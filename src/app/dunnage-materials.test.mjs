import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {dunnageMassTonnes}=await server.ssrLoadModule('/src/app/dunnage-materials.ts');
const {createDunnage}=await server.ssrLoadModule('/src/app/dunnage.ts');
const {parseFootprint}=await server.ssrLoadModule('/src/app/cargo-layout.ts');
test('volume and kg density produce tonnes with no premature rounding',()=>{assert.ok(Math.abs(dunnageMassTonnes(1.2,.8,.05,470)-.02256)<1e-12);assert.ok(Math.abs(dunnageMassTonnes(1,1,.008,860)-.00688)<1e-12);assert.throws(()=>dunnageMassTonnes(1,1,0,470));assert.throws(()=>dunnageMassTonnes(1,1,.05,NaN));});
test('material provenance and manual mass survive serialization',()=>{
 const area={id:'a',name:'Hold',xMin:0,xMax:10,yMin:0,yMax:10,deckZ:1,clearHeight:5};
 const w=createDunnage({id:'d',area,areas:[area],weights:[],length:1,width:1,thickness:.05,mass:.03,material:'Pine timber',densityKgM3:470,massMode:'manual'});
 assert.equal(w.massTonnes,'0.03');assert.deepEqual(parseFootprint(JSON.parse(JSON.stringify(w.footprint))).dunnage,{material:'Pine timber',densityKgM3:470,massMode:'manual'});
});
