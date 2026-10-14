import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {vesselCapacityLimit,resolveCapacityLimit}=await server.ssrLoadModule('/src/app/capacity-limit.ts');
const {modelSignature}=await server.ssrLoadModule('/src/app/saved-scenarios.ts');
const sources=new Map();const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{const text=sources.get(String(url));if(text===undefined)throw new Error('Unexpected fixture URL: '+url);return new Response(text);};after(()=>{globalThis.fetch=originalFetch;});
async function fixture(directory){const manifest=JSON.parse(await readFile(directory+'/manifest.json','utf8'));const resource=manifest.resources.find(r=>r.kind==='hydrostatics.upright-table');const baseUrl='http://fixture/'+manifest.id+'/';sources.set(baseUrl+resource.path,await readFile(directory+'/'+resource.path,'utf8'));return {manifest,baseUrl};}
const pontoon=await fixture('public/built-in-ship-models/training-pontoon-100x20');
const vectis=await fixture('validation-references/reviewed-apples-vessel');
test('documented summer knot and density scaling use the hydrostatic solver',async()=>{
 const limit=vesselCapacityLimit(vectis);assert.equal(limit.draft,8.011);
 assert.ok(Math.abs(await resolveCapacityLimit(vectis,limit,1.025)-13976.39)<1e-6);
 assert.ok(Math.abs(await resolveCapacityLimit(vectis,limit,1)-13976.39/1.025)<1e-6);
});
test('pontoon uses its design reference, not table endpoint, and rejects invalid density',async()=>{
 const limit=vesselCapacityLimit(pontoon);assert.equal(limit.draft,3);
 assert.ok(Math.abs(await resolveCapacityLimit(pontoon,limit,1.025)-6150)<1e-6);
 await assert.rejects(()=>resolveCapacityLimit(pontoon,limit,0));
});
test('capacity metadata preserves compatibility of existing saved plans',()=>{
 const without=structuredClone(pontoon);without.manifest.resources=without.manifest.resources.filter(r=>r.kind!=='loading.capacity');
 assert.equal(modelSignature(without),modelSignature(pontoon));
 assert.equal(vesselCapacityLimit(without),undefined);
});
