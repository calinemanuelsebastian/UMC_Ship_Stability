import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from '../../scripts/test-server.mjs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
after(()=>server.close());
const {boxHullFor,bodyPoint,sceneCondition,hullPose,exaggerateTrim}=await server.ssrLoadModule('/src/visualization/ship-scene-data.ts');
const {sourceReference,textbookReference}=await server.ssrLoadModule('/src/core/reference/reference-system.ts');
const manifest=JSON.parse(await readFile('public/built-in-ship-models/training-pontoon-100x20/manifest.json','utf8'));
const ship={manifest,baseUrl:'/'};const source=manifest.coordinateSystem;const hull=boxHullFor(ship);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('explicit box geometry uses real dimensions and maps source G to the body frame',()=>{
 assert.deepEqual(hull,{length:100,beam:20,depth:8});assert.deepEqual(bodyPoint(ship,{x:50,y:2,z:5}),{x:0,y:5,z:2});
 const other=structuredClone(ship);other.manifest.coordinateSystem={...source,longitudinalOriginFromAP:50,xPositive:'aft',yPositive:'port',zPositive:'down'};
 assert.deepEqual(bodyPoint(other,{x:-10,y:-2,z:-5}),{x:10,y:5,z:2});
});
test('UK and Russian references move only the displayed origin, never the hull or gravity',()=>{
 const uk=sceneCondition(ship,textbookReference(source,'uk'),{x:51,y:0,z:5},2.8,3.2);
 const ru=sceneCondition(ship,textbookReference(source,'russian'),{x:51,y:0,z:5},2.8,3.2);
 assert.equal(uk.origin.x,-50);assert.equal(ru.origin.x,0);assert.deepEqual(uk.gravity,ru.gravity);assert.deepEqual(hullPose(hull,uk),hullPose(hull,ru));
 const custom=sceneCondition(ship,{...sourceReference(source),profile:'custom',xPositive:'aft',yPositive:'port',zPositive:'down'},{x:51,y:0,z:5},3,3);
 assert.equal(custom.directions.x.x,-1);assert.equal(custom.directions.y.z,-1);assert.equal(custom.directions.z.y,-1);
});
test('both end waterlines land on the horizontal sea plane for bow and stern trim',()=>{
 for(const [aft,forward] of [[3,3],[2.8,3.2],[3.2,2.8]]){
  const data=sceneCondition(ship,sourceReference(source),{x:50,y:0,z:5},aft,forward);const pose=hullPose(hull,data);
  for(const [x,draft] of [[-50,aft],[50,forward]])close(Math.sin(pose.pitch)*x+Math.cos(pose.pitch)*draft+pose.heave,0);
  if(forward>aft)assert.ok(pose.pitch<0);
 }
});
test('undeclared hulls, invalid dimensions and impossible drafts are rejected',()=>{
 const other=structuredClone(ship);other.manifest.resources=[];assert.throws(()=>boxHullFor(other));
 for(const value of [0,-1,NaN,Infinity,1e9]){const other=structuredClone(ship);other.manifest.principalDimensions.lbp=value;assert.throws(()=>boxHullFor(other));}
 for(const value of [-1,9,NaN])assert.throws(()=>sceneCondition(ship,sourceReference(source),{x:50,y:0,z:5},value,3));
});

test('visual exaggeration multiplies angle while preserving actual results and mean draft',()=>{
 const actual=sceneCondition(ship,sourceReference(source),{x:51,y:0,z:5},2.8,3.2);const before=structuredClone(actual);
 for(const factor of [1,5,10]){
  const visual=exaggerateTrim(hull,actual,factor);
  close(hullPose(hull,visual).pitch,hullPose(hull,actual).pitch*factor);
  close((visual.draftAft+visual.draftForward)/2,3);
  const pose=hullPose(hull,visual);
  for(const [x,draft] of [[-50,visual.draftAft],[50,visual.draftForward]])close(Math.sin(pose.pitch)*x+Math.cos(pose.pitch)*draft+pose.heave,0);
 }
 assert.deepEqual(actual,before);
});
test('exaggeration rejects impossible hull intersections and leaves even keel unchanged',()=>{
 const level=sceneCondition(ship,sourceReference(source),{x:50,y:0,z:5},3,3);
 assert.deepEqual(exaggerateTrim(hull,level,10),level);
 assert.equal(exaggerateTrim(hull,{...level,draftAft:1,draftForward:5},10),undefined);
 for(const factor of [0,-1,2,NaN,Infinity])assert.equal(exaggerateTrim(hull,level,factor),undefined);
});

test('Vectis schematic is available without enabling rectangular buoyancy',async()=>{
 const {visualHullFor,schematicOutline,heeledBox}=await server.ssrLoadModule('/src/visualization/ship-scene-data.ts');
 const manifest=JSON.parse(await readFile('validation-references/reviewed-apples-vessel/manifest.json','utf8'));
 const model={manifest,baseUrl:'/'};const h=visualHullFor(model);
 assert.equal(h.depth,11.4);assert.equal(h.length,121.7);assert.equal(h.schematic,true);
 assert.throws(()=>boxHullFor(model),/geometry/);assert.throws(()=>heeledBox(h,5.8,10),/unavailable/);
 const outline=schematicOutline(h);assert.equal(Math.max(...outline.map(p=>p[0])),h.length/2);
 assert.deepEqual(bodyPoint(model,{x:60.85,y:0,z:5}),{x:0,y:5,z:0});
});
