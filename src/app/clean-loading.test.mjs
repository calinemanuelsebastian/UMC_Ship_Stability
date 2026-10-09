import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {cleanLoadingPlan,isFixedWeight}=await server.ssrLoadModule('/src/app/tank-operations.ts');
const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));
const ship={manifest,baseUrl:'/'};
test('clean plan retains fixed masses and creates editable empty tanks without cargo or dunnage',()=>{
 const fixed=manifest.resources.find(r=>r.kind==='loading.weights').config.fixedWeightIds;
 const reference=[...fixed.map(id=>({id,massTonnes:'20'})),{id:'cargo-apples',massTonnes:'100'},{id:'dunnage',massTonnes:'2'}];
 const catalog={tanks:[{id:'t',name:'Tank',group:'ballast',capacityM3:10,defaultDensity:1.025,fullCentre:[1,2,3],rows:[[0,1,2,3,0],[10,1,2,3,0]]}]};
 const result=cleanLoadingPlan(ship,reference,catalog);
 assert.equal(result.length,fixed.length+1);assert.ok(result.filter(w=>!w.tank).every(w=>isFixedWeight(ship,w.id)));assert.equal(result.at(-1).massTonnes,'0');assert.equal(result.at(-1).tank.volumeM3,0);assert.equal(reference.length,fixed.length+2);
});
