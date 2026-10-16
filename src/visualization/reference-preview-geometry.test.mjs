import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});after(()=>server.close());
const {referencePreview}=await server.ssrLoadModule('/src/visualization/reference-preview.ts');
const {sourceReference}=await server.ssrLoadModule('/src/core/reference/reference-system.ts');
for(const file of ['public/built-in-ship-models/training-pontoon-100x20/manifest.json','validation-references/reviewed-apples-vessel/manifest.json']){
 const manifest=JSON.parse(await readFile(file,'utf8')),ship={manifest,baseUrl:'/'};
 test(`${manifest.name}: preview remains finite with off-centre weights and missing calculation inputs`,()=>{
  for(const y of [-2,0,2,NaN,undefined]){
   const view=referencePreview(ship,sourceReference(manifest.coordinateSystem),{x:NaN,y,z:undefined});
   assert.equal(view.calculated,false);assert.equal(view.equilibriumPose,undefined);
   assert.equal(view.draftAft,view.draftForward);
   assert.ok(Object.values(view.gravity).every(Number.isFinite));
   assert.ok(view.draftAft>=0&&view.draftAft<=manifest.principalDimensions.mouldedDepth);
  }
 });
 test(`${manifest.name}: absent or invalid reference drafts never suppress geometry`,()=>{
  for(const draft of [undefined,NaN,-1,100000]){
   const other=structuredClone(ship);other.manifest.defaultCondition.draft=draft;
   assert.equal(referencePreview(other,sourceReference(manifest.coordinateSystem),{}).draftAft,manifest.principalDimensions.mouldedDepth/2);
  }
 });
}
